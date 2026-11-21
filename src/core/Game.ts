import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AudioManager } from '../audio/AudioManager';
import { GAME_CONFIG } from '../config';
import { EndingManager } from '../endings/EndingManager';
import { GhostManager } from '../ghost/GhostManager';
import { InputManager } from '../input/Input';
import { TouchControls } from '../input/TouchControls';
import { InteractionSystem } from '../interaction/InteractionSystem';
import { DOCUMENTS, DOCUMENT_MAP, WORLD_DOCUMENT_PICKUPS } from '../inventory/documentData';
import { InventorySystem } from '../inventory/Inventory';
import { ITEM_DEFS, WORLD_PICKUPS } from '../inventory/itemData';
import { CollisionSystem } from '../player/Collision';
import { Player } from '../player/Player';
import { PuzzleManager } from '../puzzle/PuzzleManager';
import { QuestManager } from '../quest/QuestManager';
import { SaveManager } from '../save/SaveManager';
import { StatsManager } from '../save/StatsManager';
import { GhostAudioEvents } from '../ghost/GhostManager';
import { GhostVisual } from '../ghost/GhostVisual';
import {
  DebugState,
  EndingId,
  EndingSummary,
  GameSettings,
  GameState,
  GhostState,
  HUDState,
  KeypadTarget,
  QualityLevel,
  RoomId,
  SaveData,
  ScriptedEventId,
} from '../types';
import { ROOMS } from '../world/layoutData';
import { World } from '../world/World';
import { EventBus } from './EventBus';
import { GameLoop } from './Loop';
import { PostProcessingPipeline } from './PostProcessing';
import { StateMachine } from './StateMachine';

// Bộ điều phối chính: kết nối Renderer, World, Player, Tương tác, Túi đồ, Nhiệm vụ, Câu đố, Audio và UI

export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  onHUDUpdate: (hud: HUDState) => void;
  onEnding: (summary: EndingSummary) => void;
  onNotice: (message: string) => void;
  onOpenDocument?: (docId: string | null) => void;
  onOpenKeypad?: (target: KeypadTarget | null) => void;
  onInventoryRefresh?: () => void;
  onDebugUpdate?: (debug: DebugState) => void;
}

export class Game {
  public readonly eventBus = new EventBus();
  public readonly stateMachine: StateMachine;
  public readonly saveManager: SaveManager;
  public readonly audio: AudioManager;
  public readonly input: InputManager;
  public readonly touchControls: TouchControls;
  public readonly inventory: InventorySystem;
  public readonly quest: QuestManager;
  public readonly puzzle: PuzzleManager;
  public readonly ghost: GhostManager;
  public readonly endingManager: EndingManager;
  public readonly statsManager: StatsManager;

  public settings: GameSettings;
  public readonly debugEnabled: boolean;

  private container: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private world: World | null = null;
  private collision: CollisionSystem | null = null;
  private player: Player | null = null;
  private interaction = new InteractionSystem();
  private loop: GameLoop | null = null;
  private postProcessing: PostProcessingPipeline | null = null;
  private envTexture: THREE.Texture | null = null;
  private ghostVisual: GhostVisual | null = null;

  private isSoftwareGl = false;
  private callbacks: GameCallbacks;
  private gameTimeSeconds = 0;
  private playTimeSeconds = 0;
  private lastReportedPlaySeconds = 0;
  private hudSyncTimer = 0;
  private autoSaveTimer = 0;
  private subtitleText: string | null = null;
  private subtitleTimer = 0;
  private autoQualityNote: string | null = null;
  private autoQualityNoteTimer = 0;
  private lowFpsTimer = 0;
  private wasPointerLocked = false;
  private isDraggingLook = false;
  private lastDragX = 0;
  private lastDragY = 0;

  private caughtBlackoutTimer = 0;
  private caughtNoticeText: string | null = null;
  private creakTimer = 11;
  private windTimer = 15;
  private whisperTimer = 18;
  private subModalOpen = false;
  private resizeTimerId: number | null = null;
  private readonly tempCamDir = new THREE.Vector3();

  private drawersOpened = new Set<string>();
  private collectedPickups = new Set<string>();
  private collectedDocPickups = new Set<string>();
  private rescueSpawned = false;
  private activeKeypadTarget: KeypadTarget | null = null;

  private debugState: DebugState;

  constructor(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.saveManager = new SaveManager();
    this.settings = this.saveManager.loadSettings();
    this.debugEnabled =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('debug') === '1';

    this.debugState = {
      enabled: this.debugEnabled,
      noclip: false,
      showColliders: false,
      showWaypoints: false,
      showGhostDebug: false,
      fps: 60,
      tension: 0,
      gameTimeSeconds: 0,
      ghostState: GhostState.Dormant,
      caughtCount: 0,
    };

    const initial = this.saveManager.isWarningAcknowledged()
      ? GameState.Menu
      : GameState.Warning;
    this.stateMachine = new StateMachine(initial);

    this.audio = new AudioManager(this.settings, (sub) => this.showSubtitle(sub));
    this.touchControls = new TouchControls();
    this.touchControls.setSensitivity(this.settings.mouseSensitivity);

    this.inventory = new InventorySystem();
    this.quest = new QuestManager();
    this.puzzle = new PuzzleManager();
    this.ghost = new GhostManager();
    this.endingManager = new EndingManager(this.saveManager);
    this.statsManager = new StatsManager((_id, title) => {
      this.callbacks.onNotice(`Mở khóa thành tựu: ${title}`);
    });

    // Gắn EventBus cho GĐ3 lắng nghe sự kiện sai mật mã, mất/có điện...
    this.eventBus.on('wrong_pin', ({ tensionDelta }) => {
      this.ghost.setTension(this.ghost.tension + tensionDelta);
      this.audio.playKeypadBeep('err');
      this.pushHudNow();
    });
    this.eventBus.on('toast', ({ message }) => {
      this.callbacks.onNotice(message);
    });

    this.eventBus.on('power_restored', () => {
      if (!this.ghost.triggeredEvents.has('S3') && this.player) {
        this.ghost.triggerScriptedEvent(
          'S3',
          this.player.position,
          this.getGhostEvents(),
          this.isDoorLockedBetween,
        );
      }
    });

    this.input = new InputManager({
      onFirstGesture: () => this.audio.initOnGesture(),
      onToggleFlashlight: () => {
        if (!this.stateMachine.isPlaying() || !this.player) return;
        if (this.player.isHiding) {
          this.callbacks.onNotice('Không thể bật đèn pin khi đang trốn trong tủ.');
          return;
        }
        if (!this.player.flashlight.hasFlashlight) {
          this.callbacks.onNotice('Bạn chưa có đèn pin. Hãy tìm trong tủ đầu giường.');
          return;
        }
        const on = this.player.flashlight.toggle();
        this.audio.playFlashlightClick(on);
        this.pushHudNow();
      },
      onToggleCrouch: () => {
        if (!this.stateMachine.isPlaying() || !this.player) return;
        this.player.toggleCrouch();
        this.pushHudNow();
      },
      onInteract: () => {
        if (!this.stateMachine.isPlaying() || !this.player) return;
        if (this.player.isHiding) {
          this.exitHidingSpot();
          return;
        }
        this.interaction.triggerActive();
      },
      onToggleInventory: () => {
        const st = this.stateMachine.getState();
        if (st === GameState.Playing) {
          this.openInventory();
        } else if (st === GameState.Inventory) {
          this.closeOverlayToPlaying();
        }
      },
      onToggleJournal: () => {
        const st = this.stateMachine.getState();
        if (st === GameState.Playing) {
          this.openJournal(null);
        } else if (st === GameState.Journal) {
          this.closeOverlayToPlaying();
        }
      },
      onPause: () => {
        if (this.subModalOpen) return;
        const st = this.stateMachine.getState();
        if (st === GameState.Playing) {
          this.pauseGame();
        } else if (st === GameState.Paused) {
          this.resumeGame();
        } else if (
          st === GameState.Inventory ||
          st === GameState.Journal ||
          st === GameState.Keypad
        ) {
          this.closeOverlayToPlaying();
        }
      },
      onPointerLockChange: (locked) => {
        if (
          !locked &&
          this.wasPointerLocked &&
          this.stateMachine.isPlaying() &&
          !this.debugEnabled
        ) {
          this.pauseGame();
        }
        this.wasPointerLocked = locked;
        this.pushHudNow();
      },
    });
    this.input.setSensitivity(this.settings.mouseSensitivity);
    this.input.setKeyBindings(this.settings.keyBindings);

    this.stateMachine.subscribe((next) => {
      this.callbacks.onStateChange(next);
      if (next !== GameState.Playing) {
        this.wasPointerLocked = false;
        this.isDraggingLook = false;
        this.input.exitPointerLock();
        this.input.clearKeys();
        this.touchControls.reset();
        this.audio.setDroneTension(0.05);
      }
      this.pushHudNow();
    });
  }

  public mount(container: HTMLElement): boolean {
    this.container = container;

    const probeCanvas = document.createElement('canvas');
    const gl =
      probeCanvas.getContext('webgl2') ||
      probeCanvas.getContext('webgl') ||
      probeCanvas.getContext('experimental-webgl');

    if (!gl) {
      this.stateMachine.transition(GameState.WebGLError);
      return false;
    }

    const webgl = gl as WebGLRenderingContext;
    const ext = webgl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : webgl.RENDERER;
    const gpuStr = String(webgl.getParameter(param) ?? '');
    webgl.getExtension('WEBGL_lose_context')?.loseContext();
    this.isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuStr);

    const renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    canvas.addEventListener('mousedown', this.handleCanvasMouseDown);
    window.addEventListener('mousemove', this.handleCanvasDragMove);
    window.addEventListener('mouseup', this.handleCanvasMouseUp);

    container.appendChild(canvas);
    this.renderer = renderer;
    this.input.attach(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040508);
    scene.fog = new THREE.FogExp2(0x040508, 0.055);
    this.scene = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = this.envTexture;
    scene.environmentIntensity = 0.22;
    pmrem.dispose();

    const aspect =
      (container.clientWidth || window.innerWidth) /
      Math.max(1, container.clientHeight || window.innerHeight);
    const camera = new THREE.PerspectiveCamera(
      GAME_CONFIG.CAMERA_FOV,
      aspect,
      GAME_CONFIG.CAMERA_NEAR,
      GAME_CONFIG.CAMERA_FAR,
    );
    this.camera = camera;

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const world = new World(maxAniso);
    scene.add(world.root);
    this.world = world;
    this.collision = new CollisionSystem(world.colliders);

    const player = new Player(scene);
    player.setReduceFlash(this.settings.reduceFlash);
    this.player = player;
    this.ghostVisual = new GhostVisual(scene);
    this.postProcessing = new PostProcessingPipeline(renderer, scene, camera, this.isSoftwareGl);

    this.registerWorldInteractions();
    this.applyQualityPreset(this.settings.quality);
    if (!this.isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleOrientationChange);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.loop = new GameLoop(
      renderer,
      this.isSoftwareGl,
      (dt) => this.fixedUpdate(dt),
      () => this.render(),
    );
    this.loop.start();
    this.pushHudNow();

    return true;
  }

  private registerWorldInteractions(): void {
    if (!this.world) return;
    this.interaction.clear();

    // 1. Cửa
    this.world.doors.forEach((rt, doorId) => {
      this.interaction.register({
        id: doorId,
        getPrompt: () => {
          if (rt.isJammed) return 'Nhấn E để thử mở cửa';
          if (rt.def.isMainExit) {
            return rt.isOpen ? 'Cửa chính đã mở (bước ra ngoài)' : 'Nhấn E để mở cửa chính';
          }
          if (rt.locked) {
            const keyName = rt.def.requiredKeyId ? ITEM_DEFS[rt.def.requiredKeyId]?.name : 'chìa khóa';
            return rt.def.requiredKeyId && this.inventory.hasItem(rt.def.requiredKeyId)
              ? `Nhấn E để mở khóa bằng ${keyName}`
              : `Nhấn E để thử mở (Bị khóa · cần ${keyName})`;
          }
          return rt.isOpen ? 'Nhấn E để đóng cửa' : 'Nhấn E để mở cửa';
        },
        onInteract: () => this.handleDoorInteract(doorId),
      });
    });

    // 2. Vật phẩm nhặt trực tiếp
    for (const p of WORLD_PICKUPS) {
      this.interaction.register({
        id: p.id,
        getPrompt: () => {
          if (this.collectedPickups.has(p.id)) return null;
          return `Nhấn E để nhặt ${p.label}`;
        },
        onInteract: () => {
          if (this.collectedPickups.has(p.id)) return;
          const ok = this.inventory.addItem(p.itemId);
          if (!ok) {
            this.callbacks.onNotice('Túi đồ đã đầy (8/8 ô). Hãy bỏ hoặc dùng bớt vật phẩm.');
            return;
          }
          this.collectedPickups.add(p.id);
          this.world?.setPickupVisible(p.id, false);
          this.audio.playPickup();
          const def = ITEM_DEFS[p.itemId];
          this.callbacks.onNotice(`Đã nhặt: ${def?.name ?? p.label}`);

          if (p.itemId === 'cursed_doll') {
            this.callbacks.onNotice('Cảnh báo: Con búp bê sứ tỏa ra hơi lạnh bất thường...');
          }
          if (p.docOnPickup) {
            this.recordReadDocument(p.docOnPickup);
            this.openJournal(p.docOnPickup);
          }
          this.refreshQuestProgress();
          this.autoSave();
        },
      });
    }

    // Pin cứu hộ
    this.interaction.register({
      id: 'pickup_rescue_battery',
      getPrompt: () => 'Nhấn E để nhặt Pin dự phòng (cứu hộ)',
      onInteract: () => {
        if (!this.inventory.addItem('battery')) {
          this.callbacks.onNotice('Túi đồ đã đầy.');
          return;
        }
        this.world?.hideRescueBattery();
        this.audio.playPickup();
        this.callbacks.onNotice('Đã nhặt Pin dự phòng.');
        this.pushHudNow();
      },
    });

    // 3. Tài liệu đặt ngoài thế giới
    for (const d of WORLD_DOCUMENT_PICKUPS) {
      this.interaction.register({
        id: d.id,
        getPrompt: () => {
          if (this.collectedDocPickups.has(d.id)) return null;
          return `Nhấn E để đọc ${d.label}`;
        },
        onInteract: () => {
          this.collectedDocPickups.add(d.id);
          this.world?.setDocVisible(d.id, false);
          this.recordReadDocument(d.docId);
          this.audio.playPaperRustle();
          this.refreshQuestProgress();
          this.openJournal(d.docId);
          this.autoSave();
        },
      });
    }

    // 4. Ngăn kéo & Đồ vật tương tác đặc biệt
    // Tủ đầu giường (Phòng ngủ) -> Đèn pin
    this.interaction.register({
      id: 'prop_nightstand',
      getPrompt: () =>
        this.drawersOpened.has('prop_nightstand')
          ? 'Ngăn kéo tủ đầu giường (Trống)'
          : 'Nhấn E để mở ngăn kéo tủ đầu giường',
      onInteract: () => {
        this.audio.playDrawerSlide();
        if (this.drawersOpened.has('prop_nightstand')) {
          this.callbacks.onNotice('Ngăn kéo tủ đầu giường đã trống.');
          return;
        }
        if (!this.inventory.addItem('flashlight')) {
          this.callbacks.onNotice('Túi đồ đã đầy.');
          return;
        }
        this.drawersOpened.add('prop_nightstand');
        if (this.player) {
          this.player.flashlight.hasFlashlight = true;
          this.player.flashlight.isOn = true;
        }
        this.audio.playFlashlightClick(true);
        this.callbacks.onNotice('Đã lấy Đèn pin cũ! Nhấn F để bật/tắt.');
        this.refreshQuestProgress();
        this.autoSave();
      },
    });

    // Tủ TV (Phòng khách) -> Chìa phòng làm việc
    this.interaction.register({
      id: 'prop_tv_stand',
      getPrompt: () =>
        this.drawersOpened.has('prop_tv_stand')
          ? 'Ngăn kéo tủ TV (Trống)'
          : 'Nhấn E để mở ngăn kéo tủ TV',
      onInteract: () => {
        this.audio.playDrawerSlide();
        if (this.drawersOpened.has('prop_tv_stand')) {
          this.callbacks.onNotice('Ngăn kéo tủ TV không còn gì.');
          return;
        }
        this.drawersOpened.add('prop_tv_stand');
        this.inventory.addItem('study_key', true);
        this.audio.playPickup();
        this.callbacks.onNotice('Đã tìm thấy Chìa phòng làm việc!');
        this.refreshQuestProgress();
        this.autoSave();
      },
    });

    // Tủ bếp (Nhà bếp) -> Pin + Hóa đơn điện số 58
    this.interaction.register({
      id: 'prop_kitchen_counter',
      getPrompt: () =>
        this.drawersOpened.has('prop_kitchen_counter')
          ? 'Nhấn E để xem lại Hóa đơn điện (tủ bếp)'
          : 'Nhấn E để mở ngăn kéo tủ bếp',
      onInteract: () => {
        this.audio.playDrawerSlide();
        if (!this.drawersOpened.has('prop_kitchen_counter')) {
          this.drawersOpened.add('prop_kitchen_counter');
          const addedBat = this.inventory.addItem('battery');
          this.recordReadDocument('doc_04_electric_bill');
          this.audio.playPickup();
          this.callbacks.onNotice(
            addedBat
              ? 'Tìm thấy Pin dự phòng và Hóa đơn tiền điện!'
              : 'Tìm thấy Hóa đơn tiền điện (Túi đầy nên chưa nhặt được Pin).',
          );
          this.autoSave();
        }
        this.openJournal('doc_04_electric_bill');
      },
    });

    // Bàn làm việc (Tầng 2) -> Khóa mã 0317 -> Chìa tầng hầm
    this.interaction.register({
      id: 'prop_study_desk',
      getPrompt: () => {
        if (this.drawersOpened.has('prop_study_desk')) return 'Ngăn kéo bàn làm việc (Trống)';
        return this.puzzle.isStudyDrawerUnlocked()
          ? 'Nhấn E để lấy đồ trong ngăn kéo bàn làm việc'
          : 'Nhấn E để mở khóa mã ngăn kéo bàn (4 số)';
      },
      onInteract: () => {
        if (this.drawersOpened.has('prop_study_desk')) {
          this.callbacks.onNotice('Ngăn kéo bàn làm việc đã trống.');
          return;
        }
        if (!this.puzzle.isStudyDrawerUnlocked()) {
          this.openKeypad('study_drawer');
          return;
        }
        this.collectStudyDrawerReward();
      },
    });

    // Hộp dụng cụ (Kho đồ tầng 2) -> Cầu chì
    this.interaction.register({
      id: 'prop_storage2f_toolbox',
      getPrompt: () =>
        this.drawersOpened.has('prop_storage2f_toolbox')
          ? 'Hộp dụng cụ (Trống)'
          : 'Nhấn E để mở hộp dụng cụ',
      onInteract: () => {
        this.audio.playDrawerSlide();
        if (this.drawersOpened.has('prop_storage2f_toolbox')) {
          this.callbacks.onNotice('Hộp dụng cụ không còn gì thêm.');
          return;
        }
        this.drawersOpened.add('prop_storage2f_toolbox');
        this.inventory.addItem('fuse', true);
        this.audio.playPickup();
        this.callbacks.onNotice('Đã lấy Cầu chì!');
        this.refreshQuestProgress();
        this.autoSave();
      },
    });

    // Giá vẽ bức tranh bé Mai (Kho đồ tầng 2) -> Tài liệu 7 + chữ ẩn 21
    this.interaction.register({
      id: 'prop_storage2f_easel',
      getPrompt: () => 'Nhấn E để quan sát bức tranh bé Mai',
      onInteract: () => {
        this.recordReadDocument('doc_07_mai_drawing');
        this.audio.playPaperRustle();
        this.openJournal('doc_07_mai_drawing');
      },
    });

    // Bàn phím mật mã cửa chính
    this.interaction.register({
      id: 'prop_keypad',
      getPrompt: () => {
        if (!this.puzzle.powerRestored) return 'Bàn phím cửa chính (Đang mất điện)';
        return this.puzzle.isMainDoorKeypadSolved()
          ? 'Khóa điện từ cửa chính đã mở'
          : 'Nhấn E để nhập mật mã khóa phụ cửa chính';
      },
      onInteract: () => {
        if (!this.puzzle.powerRestored) {
          this.audio.playDoorLocked();
          this.callbacks.onNotice('Mất điện! Hãy khôi phục điện ở Phòng điện tầng hầm trước.');
          return;
        }
        if (this.puzzle.isMainDoorKeypadSolved()) {
          this.callbacks.onNotice('Khóa điện từ cửa chính đã mở sẵn.');
          return;
        }
        this.openKeypad('main_door');
      },
    });

    // Hộp cầu dao (Phòng điện)
    this.interaction.register({
      id: 'prop_breaker_box',
      getPrompt: () => {
        if (this.puzzle.powerRestored) return 'Cầu dao tổng (Đang cấp điện)';
        if (!this.puzzle.fuseInstalled) {
          return this.inventory.hasItem('fuse')
            ? 'Nhấn E để lắp Cầu chì vào hộp'
            : 'Hộp cầu dao (Thiếu Cầu chì)';
        }
        return 'Nhấn E để gạt cầu dao khôi phục điện';
      },
      onInteract: () => this.handleBreakerInteract(),
    });

    // Bàn thờ nghi lễ
    this.interaction.register({
      id: 'prop_altar',
      getPrompt: () => {
        const carriedRelic = this.getFirstCarriedRelic();
        if (carriedRelic) {
          return `Nhấn E để đặt ${ITEM_DEFS[carriedRelic]?.name} lên bàn thờ`;
        }
        return `Bàn thờ nghi lễ (Đã đặt ${this.puzzle.placedRelics.size}/3 di vật)`;
      },
      onInteract: () => this.handleAltarInteract(),
    });

    // Giường ngủ (Lưu game)
    this.interaction.register({
      id: 'prop_bed',
      getPrompt: () => 'Nhấn E để lưu tiến trình tại giường ngủ',
      onInteract: () => {
        const res = this.saveManager.saveGame(this.buildSaveData());
        this.callbacks.onNotice(
          res.ok
            ? 'Đã lưu tiến trình tại giường ngủ.'
            : (res.error ?? 'Không thể lưu tiến trình.'),
        );
      },
    });

    // Chỗ trốn (vào tủ, nhìn qua khe, nín thở bằng H / mobile)
    const hidingConfigs: Array<{
      id: string;
      label: string;
      inX: number;
      inY: number;
      inZ: number;
      yaw: number;
    }> = [
      { id: 'prop_wardrobe_bed', label: 'Tủ quần áo phòng ngủ', inX: 1.18, inY: 0, inZ: 3.9, yaw: -Math.PI / 2 },
      { id: 'prop_tall_cabinet', label: 'Tủ cao phòng khách', inX: 8.22, inY: 0, inZ: 6.0, yaw: -Math.PI / 2 },
      { id: 'prop_under_counter_hide', label: 'Tủ gầm bếp', inX: 12.8, inY: 0, inZ: 10.88, yaw: 0 },
      { id: 'prop_bsm_locker', label: 'Tủ sắt hành lang hầm', inX: 13.45, inY: -3.0, inZ: 10.66, yaw: 0 },
      { id: 'prop_elec_cabinet', label: 'Tủ dụng cụ phòng điện', inX: 5.0, inY: -3.0, inZ: 3.08, yaw: Math.PI },
      { id: 'prop_ritual_cabinet', label: 'Tủ gỗ phòng nghi lễ', inX: 10.6, inY: -3.0, inZ: 10.76, yaw: 0 },
    ];
    for (const h of hidingConfigs) {
      this.interaction.register({
        id: h.id,
        getPrompt: () =>
          this.player?.isHiding ? 'Nhấn E để ra khỏi tủ' : `Nhấn E để trốn vào ${h.label}`,
        onInteract: () => {
          if (!this.player || !this.collision) return;
          if (this.player.isHiding) {
            this.exitHidingSpot();
            return;
          }
          this.audio.playDoorCreak(true);
          this.player.enterHidingSpot(h.id, h.label, h.inX, h.inY, h.inZ, h.yaw);
          this.eventBus.emit('hide_state_changed', { isHiding: true, spotId: h.id });
          this.pushHudNow();
        },
      });
    }

    // Công tắc đèn tường
    const switchRooms: Array<{ id: string; roomId: RoomId }> = [
      { id: 'switch_bedroom', roomId: 'bedroom' },
      { id: 'switch_living_room', roomId: 'living_room' },
      { id: 'switch_kitchen', roomId: 'kitchen' },
      { id: 'switch_study_2f', roomId: 'study_2f' },
    ];
    for (const sw of switchRooms) {
      this.interaction.register({
        id: sw.id,
        getPrompt: () => 'Nhấn E để bật/tắt công tắc đèn',
        onInteract: () => {
          if (!this.world) return;
          if (this.world.roomLightMuted.has(sw.roomId)) {
            this.world.roomLightMuted.delete(sw.roomId);
          } else {
            this.world.roomLightMuted.add(sw.roomId);
          }
          this.audio.playFlashlightClick(true);
        },
      });
    }
  }

  private handleDoorInteract(doorId: string): void {
    const rt = this.world?.doors.get(doorId);
    if (!rt) return;

    if (rt.isJammed) {
      this.audio.playDoorLocked();
      this.callbacks.onNotice('Cánh cửa này bị kẹt chặt, không thể mở.');
      return;
    }

    if (rt.def.isMainExit) {
      if (rt.isOpen) return;
      const missing: string[] = [];
      if (!this.puzzle.powerRestored) missing.push('điện tầng hầm');
      if (!this.inventory.hasItem('main_door_key')) missing.push('Chìa cửa chính');
      if (!this.puzzle.isMainDoorKeypadSolved()) missing.push('mật mã bàn phím');

      if (missing.length > 0) {
        this.audio.playDoorLocked();
        this.callbacks.onNotice(`Cửa chính đang khóa. Còn thiếu: ${missing.join(', ')}.`);
        return;
      }

      this.world?.setDoorState(doorId, true, false);
      this.audio.playDoorCreak(true);
      this.callbacks.onNotice('Cửa chính đã mở! Bước ra ngoài để thoát thân.');
      this.eventBus.emit('door_toggled', {
        doorId,
        isOpen: true,
        roomA: rt.def.roomA,
        roomB: rt.def.roomB,
      });
      return;
    }

    if (rt.locked) {
      const req = rt.def.requiredKeyId;
      if (req && this.inventory.hasItem(req)) {
        this.world?.setDoorState(doorId, true, false);
        this.audio.playDoorCreak(true);
        this.callbacks.onNotice(`Đã mở khóa bằng ${ITEM_DEFS[req]?.name ?? 'chìa khóa'}.`);
        this.refreshQuestProgress();
        this.autoSave();
      } else {
        this.audio.playDoorLocked();
        const keyLabel = req ? ITEM_DEFS[req]?.name : 'chìa khóa';
        this.callbacks.onNotice(`Cửa đã khóa. Cần ${keyLabel}.`);
      }
      return;
    }

    const nextOpen = !rt.isOpen;
    this.world?.setDoorState(doorId, nextOpen);
    this.audio.playDoorCreak(nextOpen);
    this.eventBus.emit('door_toggled', {
      doorId,
      isOpen: nextOpen,
      roomA: rt.def.roomA,
      roomB: rt.def.roomB,
    });
  }

  private collectStudyDrawerReward(): void {
    this.drawersOpened.add('prop_study_desk');
    this.inventory.addItem('basement_key', true);
    this.audio.playDrawerSlide();
    this.audio.playPickup();
    this.callbacks.onNotice('Ngăn kéo mở ra! Bạn nhận được Chìa tầng hầm.');
    this.refreshQuestProgress();
    this.autoSave();
  }

  private handleBreakerInteract(): void {
    if (this.puzzle.powerRestored) {
      this.callbacks.onNotice('Hệ thống điện đang hoạt động bình thường.');
      return;
    }
    if (!this.puzzle.fuseInstalled) {
      if (this.inventory.hasItem('fuse')) {
        this.puzzle.fuseInstalled = true;
        this.audio.playPickup();
        this.callbacks.onNotice('Đã lắp Cầu chì vào hộp. Hãy nhấn E lần nữa để gạt cầu dao!');
        this.pushHudNow();
      } else {
        this.audio.playDoorLocked();
        this.callbacks.onNotice('Hộp cầu dao bị thiếu Cầu chì. Hãy tìm ở Kho đồ tầng 2.');
      }
      return;
    }
    this.puzzle.powerRestored = true;
    this.audio.playBreakerSwitch();
    this.world?.updateKeypadVisual(true, this.puzzle.isMainDoorKeypadSolved());
    this.eventBus.emit('power_restored', {});
    this.callbacks.onNotice('Điện đã có trở lại! Đèn tầng hầm và khóa điện cửa chính đã bật.');
    this.refreshQuestProgress();
    this.autoSave();
  }

  private getFirstCarriedRelic(): string | null {
    const relics = ['music_box', 'bracelet', 'family_photo'];
    return relics.find((id) => this.inventory.hasItem(id)) ?? null;
  }

  private handleAltarInteract(): void {
    const carried = this.getFirstCarriedRelic();
    if (!carried) {
      this.callbacks.onNotice(
        `Đã đặt ${this.puzzle.placedRelics.size}/3 di vật lên bàn thờ. Hãy tìm đủ Hộp nhạc, Vòng tay và Khung ảnh.`,
      );
      return;
    }
    this.placeRelicOnAltar(carried);
  }

  public placeRelicOnAltar(relicId: string): boolean {
    if (!this.inventory.hasItem(relicId)) return false;
    if (!this.puzzle.placeRelic(relicId)) return false;
    this.inventory.consumeItem(relicId);
    this.world?.setAltarRelicVisible(relicId, true);
    this.audio.playPickup();
    const total = this.puzzle.placedRelics.size;
    this.eventBus.emit('relic_placed', { relicId, totalPlaced: total });
    this.callbacks.onNotice(
      total >= 3
        ? 'Đã đặt đủ 3 di vật lên bàn thờ! Linh hồn bé Mai đã được giải thoát.'
        : `Đã đặt ${ITEM_DEFS[relicId]?.name} lên bàn thờ (${total}/3).`,
    );
    this.refreshQuestProgress();
    this.autoSave();
    return true;
  }

  // === TÚI ĐỒ, NHẬT KÝ & BÀN PHÍM SỐ ===
  public openInventory(): void {
    const st = this.stateMachine.getState();
    if (st === GameState.Playing || st === GameState.Journal) {
      this.callbacks.onOpenDocument?.(null);
      this.stateMachine.transition(GameState.Inventory);
      this.callbacks.onInventoryRefresh?.();
    }
  }

  public openJournal(docId: string | null): void {
    const st = this.stateMachine.getState();
    if (st === GameState.Playing || st === GameState.Inventory || st === GameState.Journal) {
      this.stateMachine.transition(GameState.Journal);
      this.callbacks.onOpenDocument?.(docId);
    }
  }

  public openKeypad(target: KeypadTarget): void {
    this.activeKeypadTarget = target;
    this.stateMachine.transition(GameState.Keypad);
    this.callbacks.onOpenKeypad?.(target);
  }

  public closeOverlayToPlaying(): void {
    this.activeKeypadTarget = null;
    this.callbacks.onOpenDocument?.(null);
    this.callbacks.onOpenKeypad?.(null);
    this.stateMachine.transition(GameState.Playing);
    if (!this.input.isTouchCapable) {
      this.input.requestPointerLock();
    }
  }

  public submitKeypadCode(code: string): { ok: boolean; message: string } {
    const target = this.activeKeypadTarget;
    if (!target) return { ok: false, message: 'Không có khóa nào đang mở.' };

    if (target === 'study_drawer') {
      if (this.puzzle.checkStudyDrawerCode(code)) {
        this.audio.playKeypadBeep('ok');
        this.collectStudyDrawerReward();
        this.closeOverlayToPlaying();
        return { ok: true, message: 'Mật mã chính xác!' };
      }
      this.eventBus.emit('wrong_pin', { target: 'study_drawer', tensionDelta: GAME_CONFIG.TENSION_WRONG_PIN });
      return { ok: false, message: 'Sai mật mã. Hãy nhớ lại thời khắc trên đồng hồ phòng khách.' };
    }

    if (this.puzzle.checkMainDoorCode(code)) {
      this.audio.playKeypadBeep('ok');
      this.world?.updateKeypadVisual(this.puzzle.powerRestored, true);
      this.callbacks.onNotice('Mật mã đúng! Khóa điện từ cửa chính đã mở.');
      this.autoSave();
      this.closeOverlayToPlaying();
      return { ok: true, message: 'Đã mở khóa điện từ!' };
    }

    this.eventBus.emit('wrong_pin', { target: 'main_door', tensionDelta: GAME_CONFIG.TENSION_WRONG_PIN });
    return { ok: false, message: 'Sai mật mã. Gợi ý: số nhà, rồi ngày sinh của Mai.' };
  }

  public useInventoryItem(itemId: string): string {
    if (itemId === 'battery') {
      if (!this.player?.flashlight.hasFlashlight) {
        return 'Bạn chưa có đèn pin để lắp pin.';
      }
      if (this.player.flashlight.battery >= 99.5) {
        return 'Đèn pin đã đầy năng lượng.';
      }
      if (!this.inventory.consumeItem('battery')) return 'Không còn pin.';
      this.player.flashlight.addBattery(GAME_CONFIG.BATTERY_PICKUP_AMOUNT);
      this.audio.playPickup();
      this.pushHudNow();
      this.callbacks.onInventoryRefresh?.();
      return `Đã nạp +${GAME_CONFIG.BATTERY_PICKUP_AMOUNT}% pin cho đèn pin.`;
    }

    if (itemId === 'flashlight') {
      if (!this.player) return '';
      const on = this.player.flashlight.toggle();
      this.audio.playFlashlightClick(on);
      this.pushHudNow();
      return on ? 'Đã bật đèn pin.' : 'Đã tắt đèn pin.';
    }

    if (itemId === 'fuse') {
      if (this.puzzle.fuseInstalled) {
        return 'Cầu chì đã được lắp vào hộp cầu dao.';
      }
      if (this.player && this.player.currentRoomId === 'electrical_room') {
        const dist = Math.hypot(this.player.position.x - 4.22, this.player.position.z - 4.0);
        if (dist <= 2.8) {
          this.puzzle.fuseInstalled = true;
          this.audio.playPickup();
          this.callbacks.onNotice('Đã lắp Cầu chì vào hộp! Nhấn E để gạt cầu dao.');
          this.closeOverlayToPlaying();
          return 'Đã lắp Cầu chì vào hộp cầu dao!';
        }
      }
      return 'Hãy mang Cầu chì tới Hộp cầu dao ở Phòng điện tầng hầm.';
    }

    if (itemId === 'music_box' || itemId === 'bracelet' || itemId === 'family_photo') {
      if (this.player && this.player.currentRoomId === 'ritual_room') {
        const dist = Math.hypot(this.player.position.x - 5.4, this.player.position.z - 9.0);
        if (dist <= 3.0) {
          this.placeRelicOnAltar(itemId);
          this.callbacks.onInventoryRefresh?.();
          return `Đã đặt ${ITEM_DEFS[itemId]?.name} lên bàn thờ.`;
        }
      }
      return 'Hãy mang di vật tới Bàn thờ nghi lễ ở tầng hầm để đặt.';
    }

    return `${ITEM_DEFS[itemId]?.name ?? 'Vật phẩm'} sẽ tự động dùng khi tương tác đúng chỗ.`;
  }

  public combineInventoryItems(itemA: string, itemB: string): string {
    if (this.inventory.canCombine(itemA, itemB)) {
      return this.useInventoryItem('battery');
    }
    return 'Hai vật phẩm này không thể kết hợp với nhau.';
  }

  public dropInventoryItem(itemId: string): string {
    const res = this.inventory.dropItem(itemId);
    this.callbacks.onInventoryRefresh?.();
    this.refreshQuestProgress();
    return res.message;
  }

  private refreshQuestProgress(): void {
    const hasAnyRelic =
      this.inventory.hasItem('music_box') ||
      this.inventory.hasItem('bracelet') ||
      this.inventory.hasItem('family_photo');

    this.quest.advanceFromContext({
      hasFlashlight: this.player?.flashlight.hasFlashlight ?? false,
      hasStudyKey: this.inventory.hasItem('study_key'),
      hasBasementKey: this.inventory.hasItem('basement_key'),
      hasFuse: this.inventory.hasItem('fuse') || this.puzzle.fuseInstalled,
      powerRestored: this.puzzle.powerRestored,
      hasMainKey: this.inventory.hasItem('main_door_key'),
      escaped: false,
      hasAnyRelicOrNote10:
        hasAnyRelic || this.inventory.readDocuments.has('doc_10_ha_diary_last'),
      relicsPlaced: this.puzzle.placedRelics.size,
    });
    this.eventBus.emit('quest_updated', {});
    this.pushHudNow();
  }

  // === VÒNG ĐỜI GAME ===
  public acknowledgeWarning(): void {
    this.audio.initOnGesture();
    this.saveManager.acknowledgeWarning();
    this.stateMachine.transition(GameState.Menu);
  }

  public startNewGame(): void {
    this.audio.initOnGesture();
    this.flushPlayTimeToStats();
    this.statsManager.recordGameStart();
    this.player?.reset();
    this.inventory.reset();
    this.quest.reset();
    this.puzzle.reset();
    this.ghost.reset();
    this.drawersOpened.clear();
    this.collectedPickups.clear();
    this.collectedDocPickups.clear();
    this.rescueSpawned = false;
    this.world?.resetInteractiveVisuals();
    this.gameTimeSeconds = 0;
    this.playTimeSeconds = 0;
    this.lastReportedPlaySeconds = 0;
    this.whisperTimer = 18;
    this.lowFpsTimer = 0;
    this.world?.updateRoomVisibility('bedroom');
    this.refreshQuestProgress();
    this.stateMachine.transition(GameState.Playing);
    if (!this.input.isTouchCapable) {
      this.input.requestPointerLock();
    }
    this.pushHudNow();
  }

  public continueGame(): void {
    this.audio.initOnGesture();
    const { data, error } = this.saveManager.loadGame();
    if (!data) {
      this.callbacks.onNotice(error ?? 'Không tìm thấy bản lưu hợp lệ.');
      return;
    }
    this.applySaveData(data);
    this.stateMachine.transition(GameState.Playing);
    if (!this.input.isTouchCapable) {
      this.input.requestPointerLock();
    }
    this.pushHudNow();
  }

  public pauseGame(): void {
    if (this.stateMachine.getState() === GameState.Playing) {
      this.stateMachine.transition(GameState.Paused);
    }
  }

  public resumeGame(): void {
    this.audio.initOnGesture();
    if (this.stateMachine.getState() === GameState.Paused) {
      this.stateMachine.transition(GameState.Playing);
      if (!this.input.isTouchCapable) {
        this.input.requestPointerLock();
      }
    }
  }

  public returnToMenu(): void {
    this.flushPlayTimeToStats();
    this.autoSave();
    this.callbacks.onOpenDocument?.(null);
    this.callbacks.onOpenKeypad?.(null);
    this.stateMachine.transition(GameState.Menu);
  }

  public setSubModalOpen(open: boolean): void {
    this.subModalOpen = open;
  }

  public updateSettings(next: GameSettings): void {
    this.settings = { ...next, keyBindings: { ...next.keyBindings } };
    this.saveManager.saveSettings(this.settings);
    this.audio.updateSettings(this.settings);
    this.input.setSensitivity(this.settings.mouseSensitivity);
    this.input.setKeyBindings(this.settings.keyBindings);
    this.touchControls.setSensitivity(this.settings.mouseSensitivity);
    this.player?.setReduceFlash(this.settings.reduceFlash);
    this.applyQualityPreset(this.settings.quality);
  }

  public toggleFlashlightFromUI(): void {
    if (!this.stateMachine.isPlaying() || !this.player) return;
    this.audio.initOnGesture();
    if (!this.player.flashlight.hasFlashlight) {
      this.callbacks.onNotice('Bạn chưa nhặt Đèn pin.');
      return;
    }
    const on = this.player.flashlight.toggle();
    this.audio.playFlashlightClick(on);
    this.pushHudNow();
  }

  public toggleCrouchFromUI(): void {
    if (!this.stateMachine.isPlaying() || !this.player) return;
    this.player.toggleCrouch();
    this.pushHudNow();
  }

  public triggerInteractFromUI(): void {
    if (!this.stateMachine.isPlaying() || !this.player) return;
    this.audio.initOnGesture();
    if (this.player.isHiding) {
      this.exitHidingSpot();
      return;
    }
    this.interaction.triggerActive();
  }

  public lockPointerFromCanvas(): void {
    if (this.stateMachine.isPlaying() && !this.input.isTouchCapable) {
      this.input.requestPointerLock();
    }
  }

  // === CHẾ ĐỘ DEBUG (?debug=1) ===
  public debugSetNoclip(enabled: boolean): void {
    if (!this.debugEnabled || !this.player) return;
    this.player.noclip = enabled;
    this.debugState.noclip = enabled;
    this.callbacks.onDebugUpdate?.({ ...this.debugState });
  }

  public debugTeleportToRoom(roomId: RoomId): void {
    if (!this.debugEnabled || !this.player) return;
    const room = ROOMS[roomId];
    if (!room) return;
    const cx = (room.minX + room.maxX) / 2;
    const cz = (room.minZ + room.maxZ) / 2;
    this.player.setTeleport(cx, room.y, cz);
    this.world?.updateRoomVisibility(roomId);
    this.pushHudNow();
  }

  public debugSetGameTime(seconds: number): void {
    if (!this.debugEnabled) return;
    this.gameTimeSeconds = Math.max(0, Math.min(GAME_CONFIG.TOTAL_REAL_SECONDS - 1, seconds));
    this.pushHudNow();
  }

  public debugSetTension(value: number): void {
    if (!this.debugEnabled) return;
    this.ghost.setTension(value);
    this.pushHudNow();
  }

  public debugTriggerGhostState(state: GhostState): void {
    if (!this.debugEnabled || !this.player) return;
    this.ghost.triggerState(
      state,
      this.getGhostEvents(),
      this.player.position,
      this.isDoorLockedBetween,
    );
    if (state === GhostState.Dormant || state === GhostState.Cooldown) {
      this.audio.playWarningTone();
    }
    this.pushHudNow();
  }

  public debugTriggerScriptedEvent(id: ScriptedEventId): void {
    if (!this.debugEnabled || !this.player) return;
    this.ghost.triggerScriptedEvent(
      id,
      this.player.position,
      this.getGhostEvents(),
      this.isDoorLockedBetween,
    );
    this.pushHudNow();
  }

  public debugToggleVisuals(colliders: boolean, waypoints: boolean, ghostDebug?: boolean): void {
    if (!this.debugEnabled || !this.world) return;
    this.debugState.showColliders = colliders;
    this.debugState.showWaypoints = waypoints;
    if (ghostDebug !== undefined) {
      this.debugState.showGhostDebug = ghostDebug;
      this.ghostVisual?.setDebugVisible(ghostDebug);
    }
    this.world.setDebugVisibility(colliders, waypoints);
    this.callbacks.onDebugUpdate?.({ ...this.debugState });
  }

  public debugGiveAllItems(): void {
    if (!this.debugEnabled || !this.player) return;
    this.player.flashlight.hasFlashlight = true;
    this.player.flashlight.battery = 100;
    this.player.flashlight.isOn = true;

    if (!this.inventory.hasItem('flashlight')) this.inventory.addItem('flashlight');
    this.inventory.addItem('battery');
    this.inventory.addItem('battery');
    ['study_key', 'basement_key', 'fuse', 'main_door_key'].forEach((id) =>
      this.inventory.addItem(id, true),
    );
    ['music_box', 'bracelet', 'family_photo'].forEach((id) => {
      if (!this.inventory.hasItem(id)) this.inventory.addItem(id);
    });
    DOCUMENTS.forEach((d) => this.recordReadDocument(d.id));

    this.refreshQuestProgress();
    this.callbacks.onInventoryRefresh?.();
    this.callbacks.onNotice('Debug: Đã nhận toàn bộ vật phẩm, di vật, chìa khóa và 10 tài liệu.');
  }

  public debugSolveAllPuzzles(): void {
    if (!this.debugEnabled || !this.world) return;
    this.puzzle.solveAllInstant();
    this.world.setDoorState('door_study_2f', true, false);
    this.world.setDoorState('door_basement_alcove', true, false);
    this.world.updateKeypadVisual(true, true);
    this.refreshQuestProgress();
    this.callbacks.onNotice('Debug: Đã giải toàn bộ mật mã, cấp điện và mở khóa các cửa.');
  }

  public debugJumpNearEnd(): void {
    if (!this.debugEnabled) return;
    this.gameTimeSeconds = Math.max(0, GAME_CONFIG.TOTAL_REAL_SECONDS - 15);
    this.pushHudNow();
    this.callbacks.onNotice('Debug: Đã nhảy tới 05:57 (còn 15 giây trước 06:00).');
  }

  public debugForceEnding(endingId: EndingId): void {
    if (!this.debugEnabled) return;
    const params = {
      caughtThreeTimes: endingId === EndingId.D,
      timeExpired: endingId === EndingId.E,
      hasCursedDoll: endingId === EndingId.C,
      documentsFound:
        endingId === EndingId.B ? DOCUMENTS.length : this.getCoreReadDocumentsCount(),
      totalDocuments: DOCUMENTS.length,
      placedRelicsCount: endingId === EndingId.B ? 3 : Math.min(2, this.puzzle.placedRelics.size),
      playTimeSeconds: this.playTimeSeconds,
      caughtCount: endingId === EndingId.D ? GAME_CONFIG.GHOST_MAX_CAUGHT : this.ghost.caughtCount,
    };
    this.triggerEnding(params);
  }

  private applyQualityPreset(level: QualityLevel): void {
    if (!this.renderer || !this.player) return;
    const preset = GAME_CONFIG.QUALITY_PRESETS[level];
    const dpr = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, preset.pixelRatioMax);
    this.renderer.setPixelRatio(dpr);
    const shadowsEnabled = !this.isSoftwareGl && preset.shadows;
    this.renderer.shadowMap.enabled = shadowsEnabled;
    const atmosphereOn = !this.isSoftwareGl && level !== QualityLevel.Low && !this.settings.reduceFlash;
    this.player.flashlight.setShadowQuality(shadowsEnabled, preset.shadowMapSize, atmosphereOn);
    this.world?.setAtmosphericDust(atmosphereOn);
    this.postProcessing?.configure(level, this.settings.reduceFlash);
    const w = this.container?.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container?.clientHeight || window.innerHeight);
    this.postProcessing?.setSize(w, h, dpr);
  }

  private fixedUpdate(dt: number): void {
    // Cập nhật animation cửa mượt ngay cả khi không cần nhiều xử lý
    this.world?.updateDoorsAnimation(dt);

    if (
      !this.stateMachine.isPlaying() ||
      !this.player ||
      !this.camera ||
      !this.collision ||
      !this.world
    ) {
      return;
    }

    if (this.caughtBlackoutTimer > 0) {
      this.caughtBlackoutTimer -= dt;
      if (this.caughtBlackoutTimer <= 0) {
        this.caughtBlackoutTimer = 0;
        this.caughtNoticeText = null;
      }
      this.pushHudNow();
      return;
    }

    this.playTimeSeconds += dt;
    this.gameTimeSeconds += dt;
    this.audio.tickSubtitleCooldowns(dt);

    // Kiểm tra hết giờ 06:00 -> Kết thúc E
    if (this.gameTimeSeconds >= GAME_CONFIG.TOTAL_REAL_SECONDS) {
      this.gameTimeSeconds = GAME_CONFIG.TOTAL_REAL_SECONDS;
      this.triggerEnding({
        caughtThreeTimes: false,
        timeExpired: true,
        hasCursedDoll: this.inventory.hasCursedDoll,
        documentsFound: this.getCoreReadDocumentsCount(),
        totalDocuments: DOCUMENTS.length,
        placedRelicsCount: this.puzzle.placedRelics.size,
        playTimeSeconds: this.playTimeSeconds,
        caughtCount: this.ghost.caughtCount,
      });
      return;
    }

    const { justGasped } = this.player.update(
      dt,
      this.camera,
      this.input,
      this.touchControls,
      this.collision,
      this.audio,
    );

    // Kiểm tra bước ra khỏi cửa chính -> Thoát thân (Kết thúc A, B, hoặc C)
    if (this.player.position.x >= 16.08 && Math.abs(this.player.position.y) < 0.6) {
      this.eventBus.emit('game_escaped', {});
      this.triggerEnding({
        caughtThreeTimes: false,
        timeExpired: false,
        hasCursedDoll: this.inventory.hasCursedDoll,
        documentsFound: this.getCoreReadDocumentsCount(),
        totalDocuments: DOCUMENTS.length,
        placedRelicsCount: this.puzzle.placedRelics.size,
        playTimeSeconds: this.playTimeSeconds,
        caughtCount: this.ghost.caughtCount,
      });
      return;
    }

    const nextRoom = this.world.findRoomAt(
      this.player.position.x,
      this.player.position.y,
      this.player.position.z,
    );
    if (nextRoom !== this.player.currentRoomId) {
      this.player.currentRoomId = nextRoom;
      this.world.updateRoomVisibility(nextRoom);
      this.checkRoomScriptedEvents(nextRoom);
      this.autoSave();
    }

    // Kiểm tra chữ ẩn "21" trên tranh bé Mai khi soi đèn pin < 2 m
    const revealed21 = this.world.updateFlashlightClues(
      dt,
      this.camera,
      this.player.flashlight.isOn,
      this.player.flashlight.hasFlashlight,
    );
    if (revealed21 && !this.puzzle.revealedHiddenClue21) {
      this.puzzle.revealedHiddenClue21 = true;
      this.callbacks.onNotice('Ánh đèn pin làm lộ con số “21” mờ trên góc bức tranh!');
    }

    // Cơ chế cứu hộ pin: hết pin + hết pin trong túi + hết pin ở khu vực hiện tại
    this.checkBatteryRescue();

    // Raycast tương tác 2.0 m (tạm ngưng khi đang trốn bên trong tủ)
    if (!this.player.isHiding) {
      this.interaction.update(this.camera, this.world.root);
    }

    // Cập nhật AI Cái Bóng
    const roomDef = ROOMS[this.player.currentRoomId];
    this.camera.getWorldDirection(this.tempCamDir);
    this.ghost.update(
      {
        dt,
        playerPos: this.player.position,
        playerRoomId: this.player.currentRoomId,
        cameraForward: this.tempCamDir,
        isMoving: this.player.isMoving,
        isSprinting: this.player.isSprinting,
        isCrouching: this.player.isCrouching,
        isFlashlightOn: this.player.flashlight.isOn,
        isHiding: this.player.isHiding,
        hidingSpotId: this.player.hidingSpotId,
        isHoldingBreath: this.player.isHoldingBreath,
        justGasped,
        inSafeRoom: Boolean(roomDef?.isSafeRoom),
        collision: this.collision,
        isDoorLockedBetween: this.isDoorLockedBetween,
        openUnlockedDoorNear: this.openUnlockedDoorNear,
        hidingSpots: this.world.getAllHidingSpots(),
      },
      this.getGhostEvents(),
    );

    // Nếu bị bắt lần 3 đã chuyển sang Ending thì dừng frame hiện tại
    if (!this.stateMachine.isPlaying()) return;

    const activeGhost = this.ghost.isActiveVisible();
    const ghostDist = this.ghost.position.distanceTo(this.player.position);

    // Đèn pin & đèn phòng chập chờn khi ma ở gần (< 10 m)
    const proxFlicker =
      activeGhost && ghostDist < GAME_CONFIG.GHOST_FLICKER_RADIUS
        ? 1 - ghostDist / GAME_CONFIG.GHOST_FLICKER_RADIUS
        : 0;
    this.player.flashlight.setProximityFlicker(proxFlicker);
    this.world.updateLights(
      this.player.position,
      dt,
      this.puzzle.powerRestored,
      this.ghost.position,
      activeGhost,
      this.settings.reduceFlash,
    );

    // Cập nhật mô hình ma & đường đi/tầm nhìn debug
    this.ghostVisual?.update(
      dt,
      this.ghost.position,
      this.ghost.yaw,
      this.ghost.state,
      this.ghost.isStunned(),
      activeGhost,
    );
    this.ghostVisual?.updateDebugVisuals(
      this.ghost.position,
      this.ghost.yaw,
      this.ghost.state,
      this.ghost.currentPath,
      this.ghost.pathIndex,
      this.ghost.getCurrentSightRange(this.player.flashlight.isOn),
    );

    // Nhịp tim, drone động, bụi khí quyển, hậu kỳ và âm thanh môi trường 3D
    this.audio.setDroneTension(this.ghost.tension / 100);
    this.world.updateDust(dt, this.player.position);
    this.postProcessing?.updateUniforms(
      dt,
      this.ghost.tension / 100,
      this.ghost.state === GhostState.Chase,
    );
    const distHeart =
      activeGhost && ghostDist < GAME_CONFIG.GHOST_HEARTBEAT_RADIUS
        ? 1 - ghostDist / GAME_CONFIG.GHOST_HEARTBEAT_RADIUS
        : 0;
    const chaseBonus = this.ghost.state === GhostState.Chase ? 0.85 : 0;
    const heartIntensity = Math.max(distHeart, chaseBonus, (this.ghost.tension / 100) * 0.65);
    this.audio.updateHeartbeat(dt, heartIntensity);

    // Âm thanh môi trường 3D định kỳ (gió, nhà gỗ kêu cọt kẹt, thì thầm có hướng)
    this.updateAmbientHorrorAudio(dt);

    if (this.subtitleTimer > 0) {
      this.subtitleTimer -= dt;
      if (this.subtitleTimer <= 0) this.subtitleText = null;
    }
    if (this.autoQualityNoteTimer > 0) {
      this.autoQualityNoteTimer -= dt;
      if (this.autoQualityNoteTimer <= 0) this.autoQualityNote = null;
    }

    if (!this.isSoftwareGl && this.loop && this.settings.quality !== QualityLevel.Low) {
      if (this.loop.currentFps < GAME_CONFIG.AUTO_DOWNGRADE_FPS) {
        this.lowFpsTimer += dt;
        if (this.lowFpsTimer >= GAME_CONFIG.AUTO_DOWNGRADE_DURATION_SEC) {
          this.lowFpsTimer = 0;
          const nextQuality =
            this.settings.quality === QualityLevel.High
              ? QualityLevel.Medium
              : QualityLevel.Low;
          this.updateSettings({ ...this.settings, quality: nextQuality });
          this.autoQualityNote = `Đã tự giảm đồ họa xuống ${GAME_CONFIG.QUALITY_PRESETS[nextQuality].label} để giữ ổn định.`;
          this.autoQualityNoteTimer = 5;
        }
      } else {
        this.lowFpsTimer = 0;
      }
    }

    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= 60) {
      this.autoSaveTimer = 0;
      this.autoSave();
    }

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.1) {
      this.hudSyncTimer = 0;
      this.pushHudNow();
    }
  }

  private checkBatteryRescue(): void {
    if (this.rescueSpawned || !this.player || !this.world) return;
    if (!this.player.flashlight.hasFlashlight || this.player.flashlight.battery > 0) return;
    if (this.inventory.getItemCount('battery') > 0) return;

    const currentFloor = ROOMS[this.player.currentRoomId]?.floorLevel ?? 1;
    const hasFloorBattery = WORLD_PICKUPS.some(
      (p) =>
        p.itemId === 'battery' &&
        !this.collectedPickups.has(p.id) &&
        ROOMS[p.roomId]?.floorLevel === currentFloor,
    );
    if (hasFloorBattery) return;

    this.rescueSpawned = true;
    this.world.showRescueBatteryAt(2.52, 0.67, 0.62);
    this.callbacks.onNotice('Hết pin hoàn toàn! Một viên pin dự phòng vừa xuất hiện tại tủ đầu giường phòng ngủ.');
  }

  private render(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    if (this.postProcessing) {
      this.postProcessing.render(this.scene, this.camera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private exitHidingSpot(): void {
    if (!this.player || !this.collision || !this.player.isHiding) return;
    this.audio.playDoorCreak(false);
    this.player.exitHidingSpot(this.collision);
    this.eventBus.emit('hide_state_changed', { isHiding: false, spotId: null });
    this.pushHudNow();
  }

  private checkRoomScriptedEvents(roomId: RoomId): void {
    if (!this.player) return;
    const events = this.getGhostEvents();
    if (roomId === 'living_room' && !this.ghost.triggeredEvents.has('S1')) {
      this.ghost.triggerScriptedEvent('S1', this.player.position, events, this.isDoorLockedBetween);
    } else if (
      (roomId === 'study_2f' || roomId === 'basement_alcove') &&
      !this.ghost.triggeredEvents.has('S2')
    ) {
      this.ghost.triggerScriptedEvent('S2', this.player.position, events, this.isDoorLockedBetween);
    } else if (roomId === 'landing_2f' && !this.ghost.triggeredEvents.has('S4')) {
      this.ghost.triggerScriptedEvent('S4', this.player.position, events, this.isDoorLockedBetween);
    } else if (
      roomId === 'kitchen' &&
      !this.ghost.triggeredEvents.has('S5') &&
      (this.inventory.hasItem('study_key') || this.ghost.triggeredEvents.has('S1'))
    ) {
      this.ghost.triggerScriptedEvent('S5', this.player.position, events, this.isDoorLockedBetween);
    } else if (
      roomId === 'basement_hallway' &&
      !this.ghost.triggeredEvents.has('S6') &&
      !this.puzzle.powerRestored
    ) {
      this.ghost.triggerScriptedEvent('S6', this.player.position, events, this.isDoorLockedBetween);
    }
  }

  private isDoorLockedBetween = (roomA: RoomId, roomB: RoomId): boolean => {
    if (!this.world || roomA === roomB) return false;
    let locked = false;
    this.world.doors.forEach((rt) => {
      const match =
        (rt.def.roomA === roomA && rt.def.roomB === roomB) ||
        (rt.def.roomA === roomB && rt.def.roomB === roomA);
      if (match && (rt.locked || rt.isJammed)) {
        locked = true;
      }
    });
    return locked;
  };

  private openUnlockedDoorNear = (x: number, y: number, z: number): void => {
    if (!this.world) return;
    this.world.doors.forEach((rt, doorId) => {
      if (rt.isOpen || rt.locked || rt.isJammed || rt.def.isMainExit) return;
      if (rt.def.roomA === 'bedroom' || rt.def.roomB === 'bedroom') return;
      const d = Math.hypot(rt.def.x - x, rt.def.z - z);
      if (d <= 1.35 && Math.abs(rt.def.y - y) < 1.2) {
        this.world?.setDoorState(doorId, true);
        this.audio.playDoorCreak(true);
      }
    });
  };

  private getGhostEvents(): GhostAudioEvents {
    return {
      onStateChanged: (from, to) => {
        this.eventBus.emit('ghost_state_changed', { from, to });
      },
      onFootstep: (x, y, z, isChase) => {
        this.audio.playGhostFootstep3D(x, y, z, isChase);
        if (this.player && this.player.position.distanceTo(this.ghost.position) < 14) {
          this.audio.notifyGhostFootstepSubtitle(isChase);
        }
      },
      onWhisper: (x, y, z, sub) => {
        this.audio.playWhisper3D(x, y, z, sub);
      },
      onScare: () => {
        this.audio.playScareStinger();
        this.player?.triggerCameraShake(GAME_CONFIG.SHAKE_SCARE_INTENSITY);
      },
      onChaseStart: () => {
        this.audio.playChaseStart();
      },
      onStunned: () => {
        this.audio.playGhostStun();
        this.statsManager.recordGhostStun();
        this.eventBus.emit('ghost_stunned', { durationSec: GAME_CONFIG.GHOST_STUN_DURATION_SEC });
        this.callbacks.onNotice('Đèn pin làm Cái Bóng khựng lại trong 2.5 giây!');
      },
      onCabinetCheck: (x, y, z) => {
        this.audio.playCabinetRattle3D(x, y, z);
        const holdKey = this.input.getKeyLabel('holdBreath');
        this.callbacks.onNotice(`Cái Bóng đang kiểm tra tủ! Hãy giữ [${holdKey}] để nín thở!`);
      },
      onHideSurvived: () => {
        this.statsManager.recordHideSurvived();
        this.callbacks.onNotice('Bạn đã nín thở vượt qua lượt kiểm tra của Cái Bóng!');
      },
      onPlayerCaught: (count) => {
        this.handlePlayerCaught(count);
      },
      onScriptedEvent: (id) => {
        this.eventBus.emit('scripted_event', { id });
      },
    };
  }

  private handlePlayerCaught(count: number): void {
    this.audio.playCaughtJumpscare();
    this.statsManager.recordCaught();
    this.player?.triggerCameraShake(GAME_CONFIG.SHAKE_CAUGHT_INTENSITY);
    this.eventBus.emit('player_caught', { count, maxCount: GAME_CONFIG.GHOST_MAX_CAUGHT });

    if (count >= GAME_CONFIG.GHOST_MAX_CAUGHT) {
      this.eventBus.emit('game_caught_fatal', {});
      this.triggerEnding({
        caughtThreeTimes: true,
        timeExpired: false,
        hasCursedDoll: this.inventory.hasCursedDoll,
        documentsFound: this.getCoreReadDocumentsCount(),
        totalDocuments: DOCUMENTS.length,
        placedRelicsCount: this.puzzle.placedRelics.size,
        playTimeSeconds: this.playTimeSeconds,
        caughtCount: count,
      });
      return;
    }

    // Lần 1 và lần 2: tỉnh dậy ở Phòng ngủ, giữ toàn bộ đồ và tiến độ
    if (this.player && this.collision && this.world) {
      if (this.player.isHiding) {
        this.player.exitHidingSpot(this.collision);
      }
      this.player.setTeleport(
        GAME_CONFIG.PLAYER_START_POS.x,
        GAME_CONFIG.PLAYER_START_POS.y,
        GAME_CONFIG.PLAYER_START_POS.z,
      );
      this.player.yaw = GAME_CONFIG.PLAYER_START_YAW;
      this.player.pitch = 0;
      this.player.stamina = GAME_CONFIG.STAMINA_MAX_SECONDS;
      this.player.breathRemaining = GAME_CONFIG.HOLD_BREATH_MAX_SECONDS;
      this.player.currentRoomId = 'bedroom';
      this.world.updateRoomVisibility('bedroom');
    }

    this.ghost.handleAfterCaughtReset(this.isDoorLockedBetween);
    this.caughtBlackoutTimer = GAME_CONFIG.GHOST_CAUGHT_BLACKOUT_SEC;
    this.caughtNoticeText = `Bị Cái Bóng bắt (Lần ${count}/${GAME_CONFIG.GHOST_MAX_CAUGHT}) — Tỉnh dậy trong Phòng ngủ`;
    this.callbacks.onNotice(this.caughtNoticeText);
    this.autoSave();
    this.pushHudNow();
  }

  private updateAmbientHorrorAudio(dt: number): void {
    if (!this.player) return;
    this.creakTimer -= dt;
    if (this.creakTimer <= 0) {
      this.creakTimer =
        GAME_CONFIG.AMBIENT_CREAK_MIN_SEC +
        Math.random() * (GAME_CONFIG.AMBIENT_CREAK_MAX_SEC - GAME_CONFIG.AMBIENT_CREAK_MIN_SEC);
      const ang = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 6;
      this.audio.playHouseCreak3D(
        this.player.position.x + Math.cos(ang) * dist,
        this.player.position.y + 1.5,
        this.player.position.z + Math.sin(ang) * dist,
      );
    }

    this.windTimer -= dt;
    if (this.windTimer <= 0) {
      this.windTimer =
        GAME_CONFIG.AMBIENT_WIND_MIN_SEC +
        Math.random() * (GAME_CONFIG.AMBIENT_WIND_MAX_SEC - GAME_CONFIG.AMBIENT_WIND_MIN_SEC);
      this.audio.playWindGust();
    }

    // Thì thầm 3D có hướng từ phía sau hoặc bên hông khi Tension >= 25
    this.whisperTimer -= dt;
    if (this.whisperTimer <= 0) {
      this.whisperTimer =
        GAME_CONFIG.AMBIENT_WHISPER_MIN_SEC +
        Math.random() *
          (GAME_CONFIG.AMBIENT_WHISPER_MAX_SEC - GAME_CONFIG.AMBIENT_WHISPER_MIN_SEC);
      if (this.ghost.tension >= 25 || this.ghost.isActiveVisible()) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const yawOffset = this.player.yaw + Math.PI + side * (0.45 + Math.random() * 0.7);
        const dist = 3.2 + Math.random() * 2.5;
        const wx = this.player.position.x - Math.sin(yawOffset) * dist;
        const wz = this.player.position.z - Math.cos(yawOffset) * dist;
        const dirSub =
          side > 0
            ? '[Tiếng thì thầm khe khẽ từ phía sau bên phải...]'
            : '[Tiếng thì thầm khe khẽ từ phía sau bên trái...]';
        this.audio.playWhisper3D(wx, this.player.position.y + 1.5, wz, dirSub);
      }
    }
  }

  private pushHudNow(): void {
    const p = this.player;
    const roomId: RoomId = p?.currentRoomId ?? 'bedroom';
    const room = ROOMS[roomId];
    const fps = this.loop?.currentFps ?? 60;

    const floorLabel =
      room.floorLevel === 1 ? 'Tầng 1' : room.floorLevel === 2 ? 'Tầng 2' : 'Tầng hầm';

    const questSum = this.quest.getSummary();
    const ghostDist = p ? Math.round(this.ghost.position.distanceTo(p.position) * 10) / 10 : 99;
    const rawPrompt = p?.isHiding ? null : this.interaction.getActivePrompt();
    const interactKey = this.input.getKeyLabel('interact');
    const interactionPrompt =
      rawPrompt && interactKey !== 'E' && rawPrompt.startsWith('Nhấn E ')
        ? `Nhấn ${interactKey} ${rawPrompt.slice('Nhấn E '.length)}`
        : rawPrompt;

    const hud: HUDState = {
      batteryPercent: Math.round(p?.flashlight.battery ?? 100),
      flashlightOn: p?.flashlight.isOn ?? false,
      hasFlashlight: p?.flashlight.hasFlashlight ?? false,
      staminaPercent: Math.round(
        ((p?.stamina ?? GAME_CONFIG.STAMINA_MAX_SECONDS) / GAME_CONFIG.STAMINA_MAX_SECONDS) * 100,
      ),
      isCrouching: p?.isCrouching ?? false,
      isSprinting: p?.isSprinting ?? false,
      isHiding: p?.isHiding ?? false,
      isHoldingBreath: p?.isHoldingBreath ?? false,
      hidingSpotLabel: p?.hidingSpotLabel ?? null,
      breathPercent: Math.round(
        ((p?.breathRemaining ?? GAME_CONFIG.HOLD_BREATH_MAX_SECONDS) /
          GAME_CONFIG.HOLD_BREATH_MAX_SECONDS) *
          100,
      ),
      stunCooldownSec: Math.ceil(this.ghost.stunCooldown),
      ghostDistance: ghostDist,
      ghostState: this.ghost.state,
      caughtNotice: this.caughtBlackoutTimer > 0 ? this.caughtNoticeText : null,
      gameTimeSeconds: this.gameTimeSeconds,
      formattedTime: this.formatGameClock(this.gameTimeSeconds),
      currentRoomId: roomId,
      currentRoomName: room.name,
      currentFloorLabel: floorLabel,
      currentObjective: questSum.mainObjective,
      sideObjective: questSum.sideObjective,
      sideStatus: questSum.sideStatus,
      interactionPrompt,
      subtitleText: this.settings.showSubtitles ? this.subtitleText : null,
      tension: Math.round(this.ghost.tension),
      caughtCount: this.ghost.caughtCount,
      fps,
      pointerLocked: this.input.isPointerLocked(),
      isTouchDevice: this.input.isTouchCapable,
      isLowBattery: (p?.flashlight.battery ?? 100) < GAME_CONFIG.FLASHLIGHT_LOW_BATTERY_THRESHOLD,
      autoQualityNote: this.autoQualityNote,
      documentsFound: this.getCoreReadDocumentsCount(),
      powerRestored: this.puzzle.powerRestored,
    };

    this.callbacks.onHUDUpdate(hud);

    if (this.debugEnabled) {
      this.debugState.fps = fps;
      this.debugState.tension = Math.round(this.ghost.tension);
      this.debugState.gameTimeSeconds = this.gameTimeSeconds;
      this.debugState.ghostState = this.ghost.state;
      this.debugState.caughtCount = this.ghost.caughtCount;
      this.callbacks.onDebugUpdate?.({ ...this.debugState });
    }
  }

  private formatGameClock(realSeconds: number): string {
    const ratio = Math.max(0, Math.min(1, realSeconds / GAME_CONFIG.TOTAL_REAL_SECONDS));
    const totalGameMinutes = Math.floor(ratio * 180);
    const hour = GAME_CONFIG.START_CLOCK_HOUR + Math.floor(totalGameMinutes / 60);
    const minute = totalGameMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private showSubtitle(text: string): void {
    this.subtitleText = text;
    this.subtitleTimer = 3.0;
  }

  private buildSaveData(): SaveData {
    const doorsState: Record<string, { open: boolean; locked: boolean }> = {};
    this.world?.doors.forEach((rt, id) => {
      doorsState[id] = { open: rt.isOpen, locked: rt.locked };
    });

    return {
      version: GAME_CONFIG.SAVE_VERSION,
      savedAt: Date.now(),
      player: {
        x: this.player?.position.x ?? GAME_CONFIG.PLAYER_START_POS.x,
        y: this.player?.position.y ?? GAME_CONFIG.PLAYER_START_POS.y,
        z: this.player?.position.z ?? GAME_CONFIG.PLAYER_START_POS.z,
        yaw: this.player?.yaw ?? GAME_CONFIG.PLAYER_START_YAW,
        pitch: this.player?.pitch ?? 0,
        isCrouching: this.player?.isCrouching ?? false,
        battery: this.player?.flashlight.battery ?? 100,
        flashlightOn: this.player?.flashlight.isOn ?? false,
        hasFlashlight: this.player?.flashlight.hasFlashlight ?? false,
      },
      currentRoomId: this.player?.currentRoomId ?? 'bedroom',
      inventory: [...this.inventory.slots],
      questItems: Array.from(this.inventory.questItems),
      readDocuments: Array.from(this.inventory.readDocuments),
      currentObjective: this.quest.currentObjective,
      doorsState,
      drawersOpened: Array.from(this.drawersOpened),
      collectedItems: [
        ...Array.from(this.collectedPickups),
        ...Array.from(this.collectedDocPickups),
      ],
      solvedPuzzles: Array.from(this.puzzle.solvedPuzzles),
      powerRestored: this.puzzle.powerRestored,
      placedRelics: Array.from(this.puzzle.placedRelics),
      tension: this.ghost.tension,
      caughtCount: this.ghost.caughtCount,
      gameTimeSeconds: this.gameTimeSeconds,
      playTimeSeconds: this.playTimeSeconds,
      triggeredScriptedEvents: Array.from(this.ghost.triggeredEvents),
    };
  }

  private autoSave(): void {
    if (!this.player) return;
    this.saveManager.saveGame(this.buildSaveData());
  }

  private getCoreReadDocumentsCount(): number {
    let count = 0;
    for (const d of DOCUMENTS) {
      if (this.inventory.readDocuments.has(d.id)) count += 1;
    }
    return count;
  }

  private recordReadDocument(docId: string): void {
    this.inventory.readDocuments.add(docId);
    this.statsManager.recordDocumentRead(docId);
  }

  private flushPlayTimeToStats(): void {
    const delta = Math.round(this.playTimeSeconds - this.lastReportedPlaySeconds);
    if (delta > 0) {
      this.statsManager.recordPlayTime(delta);
      this.lastReportedPlaySeconds += delta;
    }
  }

  private triggerEnding(params: {
    caughtThreeTimes: boolean;
    timeExpired: boolean;
    hasCursedDoll: boolean;
    documentsFound: number;
    totalDocuments: number;
    placedRelicsCount: number;
    playTimeSeconds: number;
    caughtCount: number;
  }): void {
    if (this.stateMachine.getState() === GameState.Ending) return;
    this.caughtBlackoutTimer = 0;
    this.caughtNoticeText = null;
    this.activeKeypadTarget = null;
    this.callbacks.onOpenDocument?.(null);
    this.callbacks.onOpenKeypad?.(null);
    this.flushPlayTimeToStats();
    const summary = this.endingManager.resolveEnding(params);
    this.statsManager.recordEnding(summary.endingId, params.playTimeSeconds);
    this.stateMachine.transition(GameState.Ending);
    this.callbacks.onEnding(summary);
  }

  private applySaveData(data: SaveData): void {
    if (!this.player || !this.world) return;
    this.world.resetInteractiveVisuals();
    this.player.reset();
    this.rescueSpawned = false;
    this.caughtBlackoutTimer = 0;
    this.caughtNoticeText = null;

    this.player.setTeleport(data.player.x, data.player.y, data.player.z);
    this.player.yaw = data.player.yaw;
    this.player.pitch = data.player.pitch;
    this.player.isCrouching = Boolean(data.player.isCrouching);
    this.player.flashlight.battery = Math.max(0, Math.min(100, data.player.battery));
    this.player.flashlight.isOn = Boolean(data.player.flashlightOn);
    this.player.flashlight.hasFlashlight = Boolean(data.player.hasFlashlight);
    this.player.currentRoomId = data.currentRoomId ?? 'bedroom';
    this.world.updateRoomVisibility(this.player.currentRoomId);

    this.inventory.reset();
    this.inventory.slots = Array.isArray(data.inventory)
      ? data.inventory.slice(0, GAME_CONFIG.INVENTORY_SLOTS).map((s) => ({ ...s }))
      : [];
    (data.questItems ?? []).forEach((id) => this.inventory.questItems.add(id));
    (data.readDocuments ?? []).forEach((id) => this.inventory.readDocuments.add(id));
    this.inventory.hasCursedDoll = this.inventory.slots.some((s) => s.itemId === 'cursed_doll');

    this.drawersOpened = new Set(data.drawersOpened ?? []);
    this.collectedPickups.clear();
    this.collectedDocPickups.clear();
    (data.collectedItems ?? []).forEach((id) => {
      if (this.world?.pickupMeshes.has(id)) {
        this.collectedPickups.add(id);
        this.world.setPickupVisible(id, false);
      } else if (this.world?.docMeshes.has(id)) {
        this.collectedDocPickups.add(id);
        this.world.setDocVisible(id, false);
      }
    });

    Object.entries(data.doorsState ?? {}).forEach(([id, st]) => {
      this.world?.setDoorState(id, Boolean(st.open), Boolean(st.locked));
    });

    this.puzzle.reset();
    (data.solvedPuzzles ?? []).forEach((id) => this.puzzle.solvedPuzzles.add(id));
    this.puzzle.powerRestored = Boolean(data.powerRestored);
    if (this.puzzle.powerRestored) this.puzzle.fuseInstalled = true;
    (data.placedRelics ?? []).forEach((id) => {
      this.puzzle.placedRelics.add(id);
      this.world?.setAltarRelicVisible(id, true);
    });
    this.world.updateKeypadVisual(this.puzzle.powerRestored, this.puzzle.isMainDoorKeypadSolved());

    this.gameTimeSeconds = Math.max(
      0,
      Math.min(GAME_CONFIG.TOTAL_REAL_SECONDS - 1, data.gameTimeSeconds ?? 0),
    );
    this.playTimeSeconds = Math.max(0, data.playTimeSeconds ?? 0);
    this.lastReportedPlaySeconds = this.playTimeSeconds;
    this.ghost.reset();
    this.ghost.setTension(data.tension ?? 0);
    this.ghost.caughtCount = Math.max(
      0,
      Math.min(GAME_CONFIG.GHOST_MAX_CAUGHT - 1, data.caughtCount ?? 0),
    );
    (data.triggeredScriptedEvents ?? []).forEach((ev) => this.ghost.triggeredEvents.add(ev));
    this.refreshQuestProgress();
  }

  public getDocumentMeta(docId: string) {
    return DOCUMENT_MAP.get(docId);
  }

  private handleResize = (): void => {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.postProcessing?.setSize(w, h, this.renderer.getPixelRatio());
  };

  private handleOrientationChange = (): void => {
    this.handleResize();
    if (this.resizeTimerId !== null) {
      window.clearTimeout(this.resizeTimerId);
    }
    this.resizeTimerId = window.setTimeout(() => {
      this.resizeTimerId = null;
      this.handleResize();
    }, 150);
  };

  private handleWindowBlur = (): void => {
    this.input.clearKeys();
    this.touchControls.reset();
    this.isDraggingLook = false;
    if (this.stateMachine.isPlaying() && !this.debugEnabled) {
      this.pauseGame();
    }
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.input.clearKeys();
      this.touchControls.reset();
      this.isDraggingLook = false;
      if (this.stateMachine.isPlaying()) {
        this.pauseGame();
      }
    }
  };

  private handleCanvasMouseDown = (e: MouseEvent): void => {
    if (!this.stateMachine.isPlaying()) return;
    this.audio.initOnGesture();
    if (!this.input.isPointerLocked() && e.button === 0) {
      this.input.requestPointerLock();
      this.isDraggingLook = true;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
    }
  };

  private handleCanvasDragMove = (e: MouseEvent): void => {
    if (!this.isDraggingLook || this.input.isPointerLocked() || !this.stateMachine.isPlaying()) return;
    const dx = e.clientX - this.lastDragX;
    const dy = e.clientY - this.lastDragY;
    this.lastDragX = e.clientX;
    this.lastDragY = e.clientY;
    this.touchControls.addLookDelta(dx * 0.7, dy * 0.7);
  };

  private handleCanvasMouseUp = (): void => {
    this.isDraggingLook = false;
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.loop?.stop();
    this.callbacks.onNotice('Ngữ cảnh đồ họa WebGL tạm thời bị gián đoạn.');
  };

  private handleContextRestored = (): void => {
    this.loop?.start();
  };

  public dispose(): void {
    this.flushPlayTimeToStats();
    this.loop?.stop();
    this.input.detach();
    this.eventBus.clear();
    if (this.resizeTimerId !== null) {
      window.clearTimeout(this.resizeTimerId);
      this.resizeTimerId = null;
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('mousemove', this.handleCanvasDragMove);
    window.removeEventListener('mouseup', this.handleCanvasMouseUp);

    this.postProcessing?.dispose();
    this.postProcessing = null;

    if (this.renderer) {
      const canvas = this.renderer.domElement;
      canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
      canvas.removeEventListener('mousedown', this.handleCanvasMouseDown);
      if (canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
      }
      this.renderer.dispose();
    }

    if (this.scene && this.player) {
      this.player.dispose(this.scene);
    }
    if (this.scene && this.ghostVisual) {
      this.ghostVisual.dispose(this.scene);
    }
    this.world?.dispose();
    this.envTexture?.dispose();
    this.audio.dispose();
  }
}
