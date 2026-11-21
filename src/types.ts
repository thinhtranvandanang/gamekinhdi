// Các kiểu dữ liệu dùng chung cho toàn bộ dự án (chuẩn bị cho mọi giai đoạn)

export enum GameState {
  Warning = 'warning',
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  Inventory = 'inventory',
  Journal = 'journal',
  Keypad = 'keypad',
  Ending = 'ending',
  WebGLError = 'webgl_error',
}

export enum QualityLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

export enum FloorSurface {
  Wood = 'wood',
  Tile = 'tile',
  Concrete = 'concrete',
}

export type RoomId =
  | 'bedroom'
  | 'hallway_1f'
  | 'small_storage'
  | 'living_room'
  | 'kitchen'
  | 'basement_alcove'
  | 'stairs_1f_2f'
  | 'landing_2f'
  | 'hallway_2f'
  | 'study_2f'
  | 'storage_2f'
  | 'basement_hallway'
  | 'electrical_room'
  | 'ritual_room';

export enum GhostState {
  Dormant = 'Dormant',
  Scare = 'Scare',
  Stalk = 'Stalk',
  Chase = 'Chase',
  Search = 'Search',
  Cooldown = 'Cooldown',
}

export enum EndingId {
  A = 'A', // Thoát thân
  B = 'B', // Sự thật
  C = 'C', // Lời nguyền
  D = 'D', // Bị bắt
  E = 'E', // Bình minh
}

export enum ItemCategory {
  Tool = 'tool',
  Battery = 'battery',
  Quest = 'quest',
  Cursed = 'cursed',
  Relic = 'relic',
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  stackable: boolean;
}

export interface InventorySlot {
  itemId: string;
  quantity: number;
}

export interface DocumentDef {
  id: string;
  title: string;
  locationLabel: string;
  content: string;
  hiddenHint?: string;
  isSideNote?: boolean;
}

export interface AABB {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  roomId?: RoomId;
  blocksPlayer?: boolean;
  blocksLight?: boolean;
}

export interface RoomDef {
  id: RoomId;
  name: string;
  floorLevel: 1 | 2 | -1;
  y: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  surface: FloorSurface;
  isSafeRoom?: boolean;
  hasCeiling?: boolean;
  ceilingHeight?: number;
  visibleNeighbors: RoomId[];
}

export interface FloorZoneDef {
  id: string;
  roomId: RoomId;
  y: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  surface: FloorSurface;
}

export interface StairRampDef {
  id: string;
  roomId: RoomId;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  startZ: number;
  endZ: number;
  startY: number;
  endY: number;
  stepCount: number;
  surface: FloorSurface;
}

export interface WallDef {
  id: string;
  roomId: RoomId;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  y: number;
  height: number;
  thickness?: number;
  material: 'plaster' | 'concrete' | 'wood';
  openings?: Array<{
    startOffset: number; // khoảng cách từ điểm đầu đoạn tường
    width: number;
    bottomY: number; // tương đối so với y sàn
    topY: number;
    type: 'door' | 'window' | 'arch';
  }>;
}

export interface DoorDef {
  id: string;
  roomA: RoomId;
  roomB: RoomId;
  x: number;
  y: number;
  z: number;
  axis: 'x' | 'z'; // trục bản lề chạy theo chiều rộng cánh cửa
  width: number;
  height: number;
  locked: boolean;
  requiredKeyId?: string;
  isMainExit?: boolean;
  isOpen?: boolean;
  hasTalisman?: boolean;
}

export type PropKind =
  | 'bed'
  | 'nightstand'
  | 'wardrobe'
  | 'boarded_window'
  | 'talisman'
  | 'sofa'
  | 'coffee_table'
  | 'tv_stand'
  | 'fireplace'
  | 'wall_clock'
  | 'tall_cabinet'
  | 'keypad'
  | 'shelf'
  | 'crate'
  | 'kitchen_counter'
  | 'dining_table'
  | 'fridge'
  | 'under_counter_cabinet'
  | 'desk'
  | 'chair'
  | 'toolbox'
  | 'easel_painting'
  | 'breaker_box'
  | 'altar'
  | 'metal_locker'
  | 'wooden_cabinet'
  | 'window_pane'
  | 'railing'
  | 'ceiling_lamp_fixture';

export interface PropDef {
  id: string;
  roomId: RoomId;
  kind: PropKind;
  x: number;
  y: number;
  z: number;
  rotationY?: number;
  width: number;
  height: number;
  depth: number;
  solid?: boolean;
  isHidingSpot?: boolean;
  interactType?: 'drawer' | 'hide' | 'document' | 'item' | 'puzzle' | 'save' | 'none';
  label?: string;
}

export interface LightDef {
  id: string;
  roomId: RoomId;
  x: number;
  y: number;
  z: number;
  color: number;
  intensity: number;
  distance: number;
  decay?: number;
  requiresPower?: boolean;
  flicker?: boolean;
}

export interface WaypointDef {
  id: string;
  roomId: RoomId;
  x: number;
  y: number;
  z: number;
  neighbors: string[];
}

export type KeyAction =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'sprint'
  | 'crouch'
  | 'flashlight'
  | 'interact'
  | 'holdBreath'
  | 'inventory'
  | 'journal';

export type KeyBindings = Record<KeyAction, string>;

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  mouseSensitivity: number;
  quality: QualityLevel;
  reduceFlash: boolean;
  showSubtitles: boolean;
  keyBindings: KeyBindings;
}

export type ScriptedEventId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

export type AchievementId =
  | 'first_escape'
  | 'truth_seeker'
  | 'flash_stunner'
  | 'silent_breath'
  | 'collector_all'
  | 'cursed_curiosity';

export interface PlayerStats {
  gamesStarted: number;
  gamesEscaped: number;
  totalPlaySeconds: number;
  timesCaughtTotal: number;
  ghostStunsTotal: number;
  hidesSurvivedTotal: number;
  fastestEscapeSeconds: number | null;
  documentsReadEver: string[];
  unlockedAchievements: AchievementId[];
}

export type QuestStatus = 'unaccepted' | 'in_progress' | 'completed';

export interface QuestSummary {
  mainObjective: string;
  mainStatus: QuestStatus;
  sideObjective: string;
  sideStatus: QuestStatus;
  relicsPlaced: number;
}

export type KeypadTarget = 'study_drawer' | 'main_door';

export interface HUDState {
  batteryPercent: number;
  flashlightOn: boolean;
  hasFlashlight: boolean;
  staminaPercent: number;
  isCrouching: boolean;
  isSprinting: boolean;
  isHiding: boolean;
  isHoldingBreath: boolean;
  hidingSpotLabel: string | null;
  breathPercent: number;
  stunCooldownSec: number;
  ghostDistance: number;
  ghostState: GhostState;
  caughtNotice: string | null;
  gameTimeSeconds: number;
  formattedTime: string;
  currentRoomId: RoomId;
  currentRoomName: string;
  currentFloorLabel: string;
  currentObjective: string;
  sideObjective: string;
  sideStatus: QuestStatus;
  interactionPrompt: string | null;
  subtitleText: string | null;
  tension: number;
  caughtCount: number;
  fps: number;
  pointerLocked: boolean;
  isTouchDevice: boolean;
  isLowBattery: boolean;
  autoQualityNote: string | null;
  documentsFound: number;
  powerRestored: boolean;
}

export interface EndingSummary {
  endingId: EndingId;
  title: string;
  subtitle: string;
  description: string;
  playTimeSeconds: number;
  documentsFound: number;
  totalDocuments: number;
  caughtCount: number;
  unlockedEndings: EndingId[];
  nextEndingHint: string;
}

export interface SaveData {
  version: number;
  savedAt: number;
  player: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    isCrouching: boolean;
    battery: number;
    flashlightOn: boolean;
    hasFlashlight: boolean;
  };
  currentRoomId: RoomId;
  inventory: InventorySlot[];
  questItems: string[];
  readDocuments: string[];
  currentObjective: string;
  doorsState: Record<string, { open: boolean; locked: boolean }>;
  drawersOpened: string[];
  collectedItems: string[];
  solvedPuzzles: string[];
  powerRestored: boolean;
  placedRelics: string[];
  tension: number;
  caughtCount: number;
  gameTimeSeconds: number;
  playTimeSeconds: number;
  triggeredScriptedEvents?: ScriptedEventId[];
}

export interface DebugState {
  enabled: boolean;
  noclip: boolean;
  showColliders: boolean;
  showWaypoints: boolean;
  showGhostDebug: boolean;
  fps: number;
  tension: number;
  gameTimeSeconds: number;
  ghostState: GhostState;
  caughtCount: number;
}
