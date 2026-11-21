import * as THREE from 'three';
import { GAME_CONFIG } from '../config';
import { CollisionSystem } from '../player/Collision';
import { GhostState, PropDef, RoomId, ScriptedEventId, WaypointDef } from '../types';
import { ROOMS, WAYPOINTS } from '../world/layoutData';

// Quản lý toàn bộ AI "Cái Bóng": máy trạng thái 6 pha, Tension, A* tránh phòng an toàn,
// tầm nhìn/nghe 3D, kiểm tra tủ trốn theo xác suất, khựng đèn pin, respawn khi kẹt và S1/S2/S3

export interface GhostUpdateContext {
  dt: number;
  playerPos: THREE.Vector3;
  playerRoomId: RoomId;
  cameraForward: THREE.Vector3;
  isMoving: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  isFlashlightOn: boolean;
  isHiding: boolean;
  hidingSpotId: string | null;
  isHoldingBreath: boolean;
  justGasped: boolean;
  inSafeRoom: boolean;
  collision: CollisionSystem;
  isDoorLockedBetween: (roomA: RoomId, roomB: RoomId) => boolean;
  openUnlockedDoorNear: (x: number, y: number, z: number) => void;
  hidingSpots: PropDef[];
}

export interface GhostAudioEvents {
  onStateChanged: (from: GhostState, to: GhostState) => void;
  onFootstep: (x: number, y: number, z: number, isChase: boolean) => void;
  onWhisper: (x: number, y: number, z: number, subtitle?: string) => void;
  onScare: (x: number, y: number, z: number) => void;
  onChaseStart: () => void;
  onStunned: () => void;
  onCabinetCheck: (x: number, y: number, z: number) => void;
  onHideSurvived?: () => void;
  onPlayerCaught: (caughtCount: number) => void;
  onScriptedEvent: (id: ScriptedEventId) => void;
}

export class GhostManager {
  public state: GhostState = GhostState.Dormant;
  public tension = 0;
  public caughtCount = 0;
  public readonly position = new THREE.Vector3(11.2, 0, 4.6);
  public yaw = 0;

  public currentPath: WaypointDef[] = [];
  public pathIndex = 0;
  public stunTimer = 0;
  public stunCooldown = 0;
  public readonly triggeredEvents = new Set<ScriptedEventId>();

  private waypointMap = new Map<string, WaypointDef>();
  private stateTimer = 0;
  private darknessTimer = 0;
  private majorEventCooldown = 10;
  private detectProgress = 0;
  private loseSightTimer = 0;
  private chaseTimer = 0;
  private stunHoldTimer = 0;
  private repathTimer = 0;
  private stepTimer = 0;
  private stuckTimer = 0;
  private lastProgressPos = new THREE.Vector3();
  private progressSampleTimer = 0;

  private lastKnownPlayerPos = new THREE.Vector3(11.2, 0, 4.6);
  private sawPlayerHideSpotId: string | null = null;
  private wasPlayerHiding = false;
  private sawPlayerRecentlyTimer = 0;
  private checkedSpotsThisPass = new Set<string>();
  private cabinetInspectTimer = 0;
  private inspectingSpotId: string | null = null;

  constructor() {
    for (const wp of WAYPOINTS) {
      this.waypointMap.set(wp.id, wp);
    }
  }

  public reset(): void {
    this.state = GhostState.Dormant;
    this.tension = 0;
    this.caughtCount = 0;
    this.position.set(11.2, 0, 4.6);
    this.yaw = 0;
    this.currentPath = [];
    this.pathIndex = 0;
    this.stateTimer = 0;
    this.darknessTimer = 0;
    this.majorEventCooldown = 10;
    this.detectProgress = 0;
    this.loseSightTimer = 0;
    this.chaseTimer = 0;
    this.stunTimer = 0;
    this.stunCooldown = 0;
    this.stunHoldTimer = 0;
    this.repathTimer = 0;
    this.stepTimer = 0;
    this.stuckTimer = 0;
    this.lastProgressPos.copy(this.position);
    this.progressSampleTimer = 0;
    this.lastKnownPlayerPos.set(11.2, 0, 4.6);
    this.sawPlayerHideSpotId = null;
    this.wasPlayerHiding = false;
    this.sawPlayerRecentlyTimer = 0;
    this.checkedSpotsThisPass.clear();
    this.cabinetInspectTimer = 0;
    this.inspectingSpotId = null;
    this.triggeredEvents.clear();
  }

  public isActiveVisible(): boolean {
    return (
      this.state === GhostState.Scare ||
      this.state === GhostState.Stalk ||
      this.state === GhostState.Chase ||
      this.state === GhostState.Search
    );
  }

  public isStunned(): boolean {
    return this.stunTimer > 0;
  }

  public getCurrentSightRange(isFlashlightOn: boolean): number {
    return isFlashlightOn
      ? GAME_CONFIG.GHOST_FLASHLIGHT_SIGHT_RANGE
      : GAME_CONFIG.GHOST_SIGHT_RANGE;
  }

  public setTension(value: number): void {
    this.tension = Math.max(GAME_CONFIG.TENSION_MIN, Math.min(GAME_CONFIG.TENSION_MAX, value));
  }

  public triggerState(
    nextState: GhostState,
    events?: GhostAudioEvents,
    playerPos?: THREE.Vector3,
    isDoorLockedBetween?: (a: RoomId, b: RoomId) => boolean,
  ): void {
    const prev = this.state;
    this.state = nextState;
    this.detectProgress = 0;
    this.loseSightTimer = 0;
    this.chaseTimer = 0;
    this.stuckTimer = 0;
    this.cabinetInspectTimer = 0;
    this.inspectingSpotId = null;
    this.checkedSpotsThisPass.clear();

    if (nextState === GhostState.Scare) {
      this.stateTimer = GAME_CONFIG.GHOST_SCARE_DURATION_SEC;
      if (playerPos) {
        this.placeNearPlayer(playerPos, 6, 11, isDoorLockedBetween);
        this.faceToward(playerPos.x, playerPos.z);
        events?.onScare(this.position.x, this.position.y, this.position.z);
      }
    } else if (nextState === GhostState.Stalk) {
      this.stateTimer = GAME_CONFIG.GHOST_STALK_DURATION_SEC;
      if (prev === GhostState.Dormant || prev === GhostState.Cooldown) {
        if (playerPos) {
          this.placeNearPlayer(playerPos, 9, 16, isDoorLockedBetween);
          this.lastKnownPlayerPos.copy(playerPos);
        }
      }
      this.repathTimer = 0;
    } else if (nextState === GhostState.Chase) {
      this.stateTimer = GAME_CONFIG.GHOST_MAX_CHASE_SEC;
      if (prev === GhostState.Dormant || prev === GhostState.Cooldown) {
        if (playerPos) {
          this.placeNearPlayer(playerPos, 7, 13, isDoorLockedBetween);
        }
      }
      if (playerPos) {
        this.lastKnownPlayerPos.copy(playerPos);
      }
      if (prev !== GhostState.Chase) {
        events?.onChaseStart();
      }
      this.repathTimer = 0;
    } else if (nextState === GhostState.Search) {
      this.stateTimer = GAME_CONFIG.GHOST_SEARCH_DURATION_SEC;
      this.repathTimer = 0;
    } else if (nextState === GhostState.Cooldown) {
      this.stateTimer = GAME_CONFIG.GHOST_COOLDOWN_DURATION_SEC;
      this.currentPath = [];
      this.sawPlayerHideSpotId = null;
    } else {
      this.stateTimer = 0;
      this.currentPath = [];
      this.sawPlayerHideSpotId = null;
    }

    if (prev !== nextState) {
      events?.onStateChanged(prev, nextState);
    }
  }

  public triggerScriptedEvent(
    id: ScriptedEventId,
    playerPos: THREE.Vector3,
    events: GhostAudioEvents,
    isDoorLockedBetween: (a: RoomId, b: RoomId) => boolean,
  ): void {
    this.triggeredEvents.add(id);
    this.setTension(this.tension + GAME_CONFIG.TENSION_SCARE_EVENT);
    events.onScriptedEvent(id);

    if (id === 'S1') {
      // S1: Tiếng bước chân và bóng lướt qua ở hành lang / phòng khách
      const wp = this.pickBestSpawnWaypoint(playerPos, 6, 12, isDoorLockedBetween);
      if (wp) {
        this.position.set(wp.x, wp.y, wp.z);
        this.faceToward(playerPos.x, playerPos.z);
      }
      this.triggerState(GhostState.Scare, events, playerPos, isDoorLockedBetween);
      events.onWhisper(
        this.position.x,
        this.position.y,
        this.position.z,
        '[Một bóng đen vừa lướt qua phía trước kèm tiếng bước chân gấp gáp...]',
      );
      this.majorEventCooldown = 20;
    } else if (id === 'S2') {
      // S2: Cúp ánh sáng thoáng qua + tiếng rít dưới cầu thang / tầng trên
      const wp = this.pickBestSpawnWaypoint(playerPos, 6, 11, isDoorLockedBetween);
      if (wp) {
        this.position.set(wp.x, wp.y, wp.z);
        this.faceToward(playerPos.x, playerPos.z);
      }
      this.triggerState(GhostState.Scare, events, playerPos, isDoorLockedBetween);
      events.onScare(this.position.x, this.position.y, this.position.z);
      this.majorEventCooldown = 25;
    } else if (id === 'S3') {
      // S3: Đỉnh điểm tầng hầm — bật cầu dao / nhặt chìa cửa chính -> Cái Bóng xuất hiện Stalk ngay
      this.setTension(Math.max(this.tension, GAME_CONFIG.TENSION_STALK_THRESHOLD + 12));
      const wp = this.pickBestSpawnWaypoint(playerPos, 7, 13, isDoorLockedBetween);
      if (wp) {
        this.position.set(wp.x, wp.y, wp.z);
      }
      this.lastKnownPlayerPos.copy(playerPos);
      this.triggerState(GhostState.Stalk, events, playerPos, isDoorLockedBetween);
      events.onWhisper(
        this.position.x,
        this.position.y,
        this.position.z,
        '[Tiếng gầm thì thầm vọng lại từ hành lang — Cái Bóng đang tiến lại gần!]',
      );
      this.majorEventCooldown = GAME_CONFIG.MAJOR_EVENT_COOLDOWN_SEC;
    } else if (id === 'S4') {
      // S4: Bóng đứng đầu cầu thang tầng 2 rồi biến mất
      this.position.set(8.8, 3.0, 4.6);
      this.faceToward(playerPos.x, playerPos.z);
      this.triggerState(GhostState.Scare, events, playerPos, isDoorLockedBetween);
      events.onWhisper(8.8, 4.3, 4.6, '[Có tiếng thì thầm từ đầu hành lang tầng 2: “Đừng lên đây...”]');
      this.majorEventCooldown = 22;
    } else if (id === 'S5') {
      // S5: Tiếng gõ tủ trong nhà bếp kèm hơi thở lạnh
      events.onCabinetCheck(12.8, 1.0, 11.1);
      events.onWhisper(12.8, 1.3, 11.1, '[Tiếng gõ cọc cọc vang lên từ phía tủ bếp tối...]');
      this.majorEventCooldown = 18;
    } else if (id === 'S6') {
      // S6: Tiếng khóc vọng về phía Phòng nghi lễ khi xuống hầm
      events.onWhisper(5.6, -1.8, 9.0, '[Tiếng trẻ con khóc nghẹn vọng từ căn phòng cuối tầng hầm...]');
      events.onScare(5.6, -1.8, 9.0);
      this.majorEventCooldown = 22;
    }
  }

  public handleAfterCaughtReset(isDoorLockedBetween: (a: RoomId, b: RoomId) => boolean): void {
    this.setTension(GAME_CONFIG.GHOST_CAUGHT_TENSION_RESET);
    this.stunTimer = 0;
    this.stunHoldTimer = 0;
    this.detectProgress = 0;
    this.loseSightTimer = 0;
    this.chaseTimer = 0;
    this.sawPlayerHideSpotId = null;
    this.cabinetInspectTimer = 0;
    this.inspectingSpotId = null;
    this.majorEventCooldown = GAME_CONFIG.MAJOR_EVENT_COOLDOWN_SEC * 0.5;

    // Đẩy Cái Bóng ra xa phòng ngủ khi người chơi tỉnh dậy
    const fallback = this.pickBestSpawnWaypoint(
      new THREE.Vector3(GAME_CONFIG.PLAYER_START_POS.x, 0, GAME_CONFIG.PLAYER_START_POS.z),
      11,
      25,
      isDoorLockedBetween,
    );
    if (fallback) {
      this.position.set(fallback.x, fallback.y, fallback.z);
    } else {
      this.position.set(11.2, 0, 4.6);
    }
    this.triggerState(GhostState.Cooldown);
  }

  public update(ctx: GhostUpdateContext, events: GhostAudioEvents): void {
    const { dt } = ctx;
    const distToPlayer = this.position.distanceTo(ctx.playerPos);
    const activeVisible = this.isActiveVisible();

    if (this.majorEventCooldown > 0) this.majorEventCooldown = Math.max(0, this.majorEventCooldown - dt);
    if (this.stunCooldown > 0) this.stunCooldown = Math.max(0, this.stunCooldown - dt);
    if (this.sawPlayerRecentlyTimer > 0) this.sawPlayerRecentlyTimer = Math.max(0, this.sawPlayerRecentlyTimer - dt);

    // Ghi nhận nếu người chơi chui vào tủ ngay trước mắt ma
    if (ctx.isHiding && !this.wasPlayerHiding) {
      if (this.sawPlayerRecentlyTimer > 0 || (this.state === GhostState.Chase && distToPlayer < 7.5)) {
        this.sawPlayerHideSpotId = ctx.hidingSpotId;
      } else {
        this.sawPlayerHideSpotId = null;
      }
    } else if (!ctx.isHiding) {
      this.sawPlayerHideSpotId = null;
      this.inspectingSpotId = null;
      this.cabinetInspectTimer = 0;
    }
    this.wasPlayerHiding = ctx.isHiding;

    // 1. Cập nhật Tension theo quy tắc cân bằng
    this.updateTension(ctx, distToPlayer, activeVisible);

    // 2. Xử lý hiệu ứng bị đèn pin rọi (Stun 2.5s, hồi chiêu 40s)
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) {
        this.stunTimer = 0;
        if (this.state === GhostState.Chase) {
          this.triggerState(GhostState.Search, events, ctx.playerPos, ctx.isDoorLockedBetween);
        }
      }
      return;
    }

    if (activeVisible && this.stunCooldown <= 0 && ctx.isFlashlightOn && !ctx.isHiding) {
      const canStun = this.checkFlashlightAimedAtGhost(ctx, distToPlayer);
      if (canStun) {
        this.stunHoldTimer += dt;
        if (this.stunHoldTimer >= GAME_CONFIG.GHOST_STUN_HOLD_SEC) {
          this.stunHoldTimer = 0;
          this.stunTimer = GAME_CONFIG.GHOST_STUN_DURATION_SEC;
          this.stunCooldown = GAME_CONFIG.GHOST_STUN_COOLDOWN_SEC;
          events.onStunned();
          return;
        }
      } else {
        this.stunHoldTimer = Math.max(0, this.stunHoldTimer - dt * 1.5);
      }
    } else {
      this.stunHoldTimer = Math.max(0, this.stunHoldTimer - dt * 2);
    }

    // 3. Đánh giá tầm nhìn & tầm nghe
    const seesPlayer = activeVisible && this.checkSight(ctx, distToPlayer);
    const hearsPlayer = activeVisible && this.checkHearing(ctx, distToPlayer);

    if (seesPlayer) {
      this.sawPlayerRecentlyTimer = 0.8;
      this.lastKnownPlayerPos.copy(ctx.playerPos);
    } else if (hearsPlayer) {
      this.lastKnownPlayerPos.copy(ctx.playerPos);
    }

    // 4. Máy trạng thái 6 pha
    switch (this.state) {
      case GhostState.Dormant: {
        if (this.majorEventCooldown <= 0 && !ctx.inSafeRoom) {
          if (this.tension >= GAME_CONFIG.TENSION_CHASE_THRESHOLD) {
            this.majorEventCooldown = GAME_CONFIG.MAJOR_EVENT_COOLDOWN_SEC;
            this.triggerState(GhostState.Chase, events, ctx.playerPos, ctx.isDoorLockedBetween);
          } else if (this.tension >= GAME_CONFIG.TENSION_STALK_THRESHOLD) {
            this.majorEventCooldown = GAME_CONFIG.MAJOR_EVENT_COOLDOWN_SEC;
            this.triggerState(GhostState.Stalk, events, ctx.playerPos, ctx.isDoorLockedBetween);
          } else if (this.tension >= GAME_CONFIG.TENSION_SCARE_THRESHOLD) {
            this.majorEventCooldown = GAME_CONFIG.MAJOR_EVENT_COOLDOWN_SEC * 0.7;
            this.triggerState(GhostState.Scare, events, ctx.playerPos, ctx.isDoorLockedBetween);
          }
        }
        break;
      }

      case GhostState.Cooldown: {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.triggerState(GhostState.Dormant, events);
        }
        break;
      }

      case GhostState.Scare: {
        this.faceToward(ctx.playerPos.x, ctx.playerPos.z);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.triggerState(GhostState.Dormant, events);
        }
        break;
      }

      case GhostState.Stalk: {
        this.stateTimer -= dt;

        // Xác suất kiểm tra tủ trốn khi đi ngang qua tủ
        if (this.handleHidingInspection(ctx, distToPlayer, events)) {
          return;
        }

        if (seesPlayer) {
          this.detectProgress += dt / GAME_CONFIG.GHOST_DETECT_FILL_SEC;
          if (this.detectProgress >= 1.0) {
            this.triggerState(GhostState.Chase, events, ctx.playerPos, ctx.isDoorLockedBetween);
            return;
          }
        } else {
          this.detectProgress = Math.max(0, this.detectProgress - dt / GAME_CONFIG.GHOST_DETECT_DECAY_SEC);
        }

        const goal = hearsPlayer || seesPlayer ? this.lastKnownPlayerPos : ctx.playerPos;
        this.moveAlongPath(ctx, goal, GAME_CONFIG.GHOST_STALK_SPEED, false, events);

        if (this.stateTimer <= 0) {
          this.triggerState(GhostState.Cooldown, events);
        }
        break;
      }

      case GhostState.Chase: {
        this.chaseTimer += dt;

        // Nếu người chơi chạy vào phòng an toàn -> ma đứng ngoài mất dấu -> Search
        if (ctx.inSafeRoom) {
          this.loseSightTimer += dt * 1.8;
          if (this.loseSightTimer >= 2.2) {
            this.triggerState(GhostState.Search, events, ctx.playerPos, ctx.isDoorLockedBetween);
            return;
          }
        } else if (seesPlayer || hearsPlayer) {
          this.loseSightTimer = 0;
        } else {
          this.loseSightTimer += dt;
        }

        // Kiểm tra bắt được người chơi
        if (!ctx.inSafeRoom && !ctx.isHiding && distToPlayer <= GAME_CONFIG.GHOST_CATCH_DISTANCE && Math.abs(this.position.y - ctx.playerPos.y) < 1.3) {
          this.caughtCount += 1;
          events.onPlayerCaught(this.caughtCount);
          return;
        }

        // Nếu ma thấy người chơi chui vào tủ trước mặt -> chạy tới mở tủ bắt
        if (ctx.isHiding && this.sawPlayerHideSpotId && ctx.hidingSpotId === this.sawPlayerHideSpotId) {
          if (distToPlayer <= 1.8 && Math.abs(this.position.y - ctx.playerPos.y) < 1.3) {
            this.caughtCount += 1;
            events.onPlayerCaught(this.caughtCount);
            return;
          }
          this.loseSightTimer = 0;
        }

        if (this.loseSightTimer >= GAME_CONFIG.GHOST_LOSE_SIGHT_SEC || this.chaseTimer >= GAME_CONFIG.GHOST_MAX_CHASE_SEC) {
          this.triggerState(GhostState.Search, events, ctx.playerPos, ctx.isDoorLockedBetween);
          return;
        }

        const targetPos = seesPlayer || hearsPlayer ? ctx.playerPos : this.lastKnownPlayerPos;
        this.moveAlongPath(ctx, targetPos, GAME_CONFIG.GHOST_CHASE_SPEED, true, events);
        break;
      }

      case GhostState.Search: {
        this.stateTimer -= dt;

        if (this.handleHidingInspection(ctx, distToPlayer, events)) {
          return;
        }

        if (seesPlayer) {
          this.detectProgress += (dt * 1.4) / GAME_CONFIG.GHOST_DETECT_FILL_SEC;
          if (this.detectProgress >= 1.0) {
            this.triggerState(GhostState.Chase, events, ctx.playerPos, ctx.isDoorLockedBetween);
            return;
          }
        } else {
          this.detectProgress = Math.max(0, this.detectProgress - dt / GAME_CONFIG.GHOST_DETECT_DECAY_SEC);
        }

        this.moveAlongPath(ctx, this.lastKnownPlayerPos, GAME_CONFIG.GHOST_SEARCH_SPEED, false, events);

        if (this.stateTimer <= 0) {
          this.triggerState(GhostState.Cooldown, events);
        }
        break;
      }
    }
  }

  private handleHidingInspection(
    ctx: GhostUpdateContext,
    distToPlayer: number,
    events: GhostAudioEvents,
  ): boolean {
    if (!ctx.isHiding || !ctx.hidingSpotId || ctx.inSafeRoom) return false;

    // Nếu ma nhìn thấy người chơi chui vào tủ -> kéo ra ngay khi tới gần
    if (this.sawPlayerHideSpotId === ctx.hidingSpotId && distToPlayer <= 1.9) {
      this.caughtCount += 1;
      events.onPlayerCaught(this.caughtCount);
      return true;
    }

    // Đang đứng kiểm tra cửa tủ trong 1.8 giây
    if (this.inspectingSpotId === ctx.hidingSpotId && this.cabinetInspectTimer > 0) {
      this.cabinetInspectTimer -= ctx.dt;
      this.faceToward(ctx.playerPos.x, ctx.playerPos.z);

      // Nếu không nín thở trong lúc ma kiểm tra ngay trước cửa tủ -> bị phát hiện!
      if (!ctx.isHoldingBreath) {
        this.caughtCount += 1;
        events.onPlayerCaught(this.caughtCount);
        return true;
      }

      if (this.cabinetInspectTimer <= 0) {
        this.inspectingSpotId = null;
        this.loseSightTimer = GAME_CONFIG.GHOST_LOSE_SIGHT_SEC;
        events.onHideSurvived?.();
        if (this.state === GhostState.Chase) {
          this.triggerState(GhostState.Search, events, ctx.playerPos, ctx.isDoorLockedBetween);
        }
      }
      return true;
    }

    // Kiểm tra xác suất khi ma đi ngang gần tủ người chơi đang trốn
    if (
      !this.checkedSpotsThisPass.has(ctx.hidingSpotId) &&
      distToPlayer <= GAME_CONFIG.GHOST_HIDE_CHECK_RADIUS &&
      Math.abs(this.position.y - ctx.playerPos.y) < 1.3
    ) {
      this.checkedSpotsThisPass.add(ctx.hidingSpotId);
      if (Math.random() < GAME_CONFIG.GHOST_HIDE_CHECK_CHANCE) {
        this.inspectingSpotId = ctx.hidingSpotId;
        this.cabinetInspectTimer = 1.9;
        events.onCabinetCheck(this.position.x, this.position.y + 1.2, this.position.z);
        return true;
      }
    }

    return false;
  }

  private updateTension(ctx: GhostUpdateContext, distToPlayer: number, activeVisible: boolean): void {
    let delta = 0;

    if (ctx.isSprinting) {
      delta += GAME_CONFIG.TENSION_SPRINT_PER_SEC * ctx.dt;
    }
    if (ctx.isFlashlightOn && activeVisible && distToPlayer <= GAME_CONFIG.GHOST_LIGHT_TENSION_RADIUS) {
      delta += GAME_CONFIG.TENSION_LIGHT_NEAR_GHOST_PER_SEC * ctx.dt;
    }
    if (!ctx.isFlashlightOn && !ctx.inSafeRoom) {
      this.darknessTimer += ctx.dt;
      if (this.darknessTimer >= GAME_CONFIG.TENSION_DARKNESS_DELAY) {
        delta += GAME_CONFIG.TENSION_DARKNESS_PER_SEC * ctx.dt;
      }
    } else {
      this.darknessTimer = 0;
    }

    if (this.state !== GhostState.Chase) {
      const decay = ctx.inSafeRoom
        ? GAME_CONFIG.TENSION_DECAY_SAFE_PER_SEC
        : GAME_CONFIG.TENSION_DECAY_NORMAL_PER_SEC;
      delta -= decay * ctx.dt;
    }

    this.setTension(this.tension + delta);
  }

  private checkSight(ctx: GhostUpdateContext, dist: number): boolean {
    if (ctx.inSafeRoom || ctx.isHiding) return false;
    const range = this.getCurrentSightRange(ctx.isFlashlightOn);
    if (dist > range) return false;
    if (Math.abs(this.position.y - ctx.playerPos.y) > 2.6) return false;

    const toPlayerX = ctx.playerPos.x - this.position.x;
    const toPlayerZ = ctx.playerPos.z - this.position.z;
    const horiz = Math.hypot(toPlayerX, toPlayerZ);
    if (horiz > 0.05) {
      const fwdX = Math.sin(this.yaw);
      const fwdZ = Math.cos(this.yaw);
      const dot = (fwdX * toPlayerX + fwdZ * toPlayerZ) / horiz;
      const cosHalf = Math.cos(THREE.MathUtils.degToRad(GAME_CONFIG.GHOST_SIGHT_ANGLE_DEG * 0.5));
      if (dot < cosHalf) return false;
    }

    const playerEyeY = ctx.playerPos.y + (ctx.isCrouching ? GAME_CONFIG.PLAYER_EYE_CROUCH : GAME_CONFIG.PLAYER_EYE_STAND);
    return ctx.collision.hasLineOfSight(
      this.position.x,
      this.position.y + 1.65,
      this.position.z,
      ctx.playerPos.x,
      playerEyeY,
      ctx.playerPos.z,
    );
  }

  private checkHearing(ctx: GhostUpdateContext, dist: number): boolean {
    if (ctx.inSafeRoom) return false;
    if (Math.abs(this.position.y - ctx.playerPos.y) > 2.4) return false;

    if (ctx.isHiding) {
      return ctx.justGasped && dist <= GAME_CONFIG.HIDE_SAFE_DISTANCE;
    }
    if (!ctx.isMoving) return false;

    const hearRadius = ctx.isSprinting
      ? GAME_CONFIG.GHOST_HEAR_SPRINT
      : ctx.isCrouching
        ? GAME_CONFIG.GHOST_HEAR_CROUCH
        : GAME_CONFIG.GHOST_HEAR_WALK;
    return dist <= hearRadius;
  }

  private checkFlashlightAimedAtGhost(ctx: GhostUpdateContext, dist: number): boolean {
    if (dist > GAME_CONFIG.GHOST_STUN_DISTANCE) return false;
    const eyeY = ctx.playerPos.y + (ctx.isCrouching ? GAME_CONFIG.PLAYER_EYE_CROUCH : GAME_CONFIG.PLAYER_EYE_STAND);
    const dx = this.position.x - ctx.playerPos.x;
    const dy = this.position.y + 1.45 - eyeY;
    const dz = this.position.z - ctx.playerPos.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.05) return false;

    const dot =
      (ctx.cameraForward.x * dx + ctx.cameraForward.y * dy + ctx.cameraForward.z * dz) / len;
    const cosAngle = Math.cos(THREE.MathUtils.degToRad(GAME_CONFIG.GHOST_STUN_ANGLE_DEG));
    if (dot < cosAngle) return false;

    return ctx.collision.hasLineOfSight(
      ctx.playerPos.x,
      eyeY,
      ctx.playerPos.z,
      this.position.x,
      this.position.y + 1.45,
      this.position.z,
    );
  }

  private moveAlongPath(
    ctx: GhostUpdateContext,
    goalPos: THREE.Vector3,
    speed: number,
    isChase: boolean,
    events: GhostAudioEvents,
  ): void {
    const dt = ctx.dt;

    // 1. Có thể đi thẳng khi cùng tầng, tầm nhìn thông thoáng và mục tiêu không ở phòng an toàn
    const goalInSafe =
      goalPos.x < 5.15 && goalPos.z < 5.15 && Math.abs(goalPos.y) < 1.2;
    const sameFloor = Math.abs(this.position.y - goalPos.y) < 0.65;
    const directOk =
      isChase &&
      !goalInSafe &&
      sameFloor &&
      this.position.distanceTo(goalPos) < 9.5 &&
      ctx.collision.hasLineOfSight(
        this.position.x,
        this.position.y + 1.4,
        this.position.z,
        goalPos.x,
        goalPos.y + 1.2,
        goalPos.z,
      );

    let targetX = goalPos.x;
    let targetZ = goalPos.z;

    if (!directOk) {
      this.repathTimer -= dt;
      if (this.repathTimer <= 0 || this.currentPath.length === 0 || this.pathIndex >= this.currentPath.length) {
        this.repathTimer = isChase ? 0.55 : 1.1;
        const startWp = this.findNearestValidWaypoint(this.position, ctx.isDoorLockedBetween);
        const goalWp = this.findNearestValidWaypoint(goalPos, ctx.isDoorLockedBetween);
        if (startWp && goalWp) {
          this.currentPath = this.findPath(startWp.id, goalWp.id, ctx.isDoorLockedBetween);
          this.pathIndex = 0;
        }
      }

      if (this.currentPath.length > 0 && this.pathIndex < this.currentPath.length) {
        const wp = this.currentPath[this.pathIndex];
        const dWp = Math.hypot(wp.x - this.position.x, wp.z - this.position.z);
        if (dWp <= GAME_CONFIG.GHOST_WAYPOINT_REACH_DIST && Math.abs(wp.y - this.position.y) < 1.2) {
          this.pathIndex += 1;
        }
        const activeWp = this.currentPath[Math.min(this.pathIndex, this.currentPath.length - 1)];
        targetX = activeWp.x;
        targetZ = activeWp.z;
      } else {
        return;
      }
    }

    const dx = targetX - this.position.x;
    const dz = targetZ - this.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.05) {
      const step = Math.min(dist, speed * dt);
      const nextX = this.position.x + (dx / dist) * step;
      const nextZ = this.position.z + (dz / dist) * step;

      // Mở cửa không khóa nếu ma đi qua lối cửa đóng
      ctx.openUnlockedDoorNear(nextX, this.position.y, nextZ);

      const resolved = ctx.collision.resolveMove(
        nextX,
        this.position.y,
        nextZ,
        GAME_CONFIG.GHOST_RADIUS,
        GAME_CONFIG.GHOST_HEIGHT,
      );

      // Chặn cứng không cho ma bước vào Phòng ngủ (Safe Room)
      if (resolved.x < 5.05 && resolved.z < 5.05 && Math.abs(resolved.y) < 1.2) {
        this.position.set(5.35, 0, Math.max(2.5, resolved.z));
      } else {
        this.position.set(resolved.x, resolved.y, resolved.z);
      }

      const targetYaw = Math.atan2(dx, dz);
      const angleDiff = Math.atan2(Math.sin(targetYaw - this.yaw), Math.cos(targetYaw - this.yaw));
      this.yaw += angleDiff * Math.min(1, dt * 8);

      // Bước chân 3D của Cái Bóng
      this.stepTimer += dt;
      const stepInterval = isChase ? 0.36 : 0.72;
      if (this.stepTimer >= stepInterval) {
        this.stepTimer = 0;
        events.onFootstep(this.position.x, this.position.y, this.position.z, isChase);
      }
    }

    // Kiểm tra kẹt quá 8 giây -> respawn ở waypoint hợp lệ
    this.progressSampleTimer += dt;
    if (this.progressSampleTimer >= 0.5) {
      const moved = this.position.distanceTo(this.lastProgressPos);
      this.lastProgressPos.copy(this.position);
      if (moved < 0.12 && dist > 0.4) {
        this.stuckTimer += this.progressSampleTimer;
        if (this.stuckTimer >= GAME_CONFIG.GHOST_RESPAWN_STUCK_SEC) {
          this.stuckTimer = 0;
          this.placeNearPlayer(ctx.playerPos, 9, 17, ctx.isDoorLockedBetween);
          this.currentPath = [];
          this.repathTimer = 0;
        }
      } else {
        this.stuckTimer = 0;
      }
      this.progressSampleTimer = 0;
    }
  }

  private faceToward(tx: number, tz: number): void {
    this.yaw = Math.atan2(tx - this.position.x, tz - this.position.z);
  }

  private isSafeRoomWaypoint(wp: WaypointDef): boolean {
    if (wp.id === 'wp_bedroom' || wp.id === 'wp_door_bed') return true;
    return Boolean(ROOMS[wp.roomId]?.isSafeRoom);
  }

  private pickBestSpawnWaypoint(
    playerPos: THREE.Vector3,
    minDist: number,
    maxDist: number,
    isDoorLockedBetween?: (a: RoomId, b: RoomId) => boolean,
  ): WaypointDef | null {
    const candidates = WAYPOINTS.filter((wp) => {
      if (this.isSafeRoomWaypoint(wp)) return false;
      const d = Math.hypot(wp.x - playerPos.x, wp.y - playerPos.y, wp.z - playerPos.z);
      if (d < minDist || d > maxDist) return false;
      if (isDoorLockedBetween && wp.roomId === 'study_2f' && isDoorLockedBetween('hallway_2f', 'study_2f')) {
        return false;
      }
      if (
        isDoorLockedBetween &&
        wp.y < -1.5 &&
        isDoorLockedBetween('kitchen', 'basement_alcove')
      ) {
        return false;
      }
      return true;
    });

    if (candidates.length === 0) {
      const fallback = WAYPOINTS.filter((wp) => !this.isSafeRoomWaypoint(wp));
      return fallback[Math.floor(Math.random() * fallback.length)] ?? null;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private placeNearPlayer(
    playerPos: THREE.Vector3,
    minDist: number,
    maxDist: number,
    isDoorLockedBetween?: (a: RoomId, b: RoomId) => boolean,
  ): void {
    const wp = this.pickBestSpawnWaypoint(playerPos, minDist, maxDist, isDoorLockedBetween);
    if (wp) {
      this.position.set(wp.x, wp.y, wp.z);
    }
  }

  private findNearestValidWaypoint(
    pos: THREE.Vector3,
    isDoorLockedBetween?: (a: RoomId, b: RoomId) => boolean,
  ): WaypointDef | null {
    let best: WaypointDef | null = null;
    let bestScore = Infinity;

    for (const wp of WAYPOINTS) {
      if (this.isSafeRoomWaypoint(wp)) continue;
      if (isDoorLockedBetween && wp.roomId === 'study_2f' && isDoorLockedBetween('hallway_2f', 'study_2f')) {
        continue;
      }
      if (isDoorLockedBetween && wp.y < -1.5 && isDoorLockedBetween('kitchen', 'basement_alcove')) {
        continue;
      }
      const d = Math.hypot(wp.x - pos.x, (wp.y - pos.y) * 2.2, wp.z - pos.z);
      if (d < bestScore) {
        bestScore = d;
        best = wp;
      }
    }
    return best;
  }

  // Thuật toán A* trên đồ thị waypoint (tránh Phòng an toàn và cửa đang khóa)
  public findPath(
    startWpId: string,
    goalWpId: string,
    isDoorLockedBetween?: (a: RoomId, b: RoomId) => boolean,
  ): WaypointDef[] {
    if (startWpId === goalWpId) {
      const wp = this.waypointMap.get(startWpId);
      return wp ? [wp] : [];
    }

    const open = new Set<string>([startWpId]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([[startWpId, 0]]);
    const fScore = new Map<string, number>([
      [startWpId, this.heuristic(startWpId, goalWpId)],
    ]);

    while (open.size > 0) {
      let current = '';
      let bestF = Infinity;
      open.forEach((id) => {
        const f = fScore.get(id) ?? Infinity;
        if (f < bestF) {
          bestF = f;
          current = id;
        }
      });

      if (current === goalWpId) {
        const path: WaypointDef[] = [];
        let cur: string | undefined = current;
        while (cur) {
          const node = this.waypointMap.get(cur);
          if (node) path.unshift(node);
          cur = cameFrom.get(cur);
        }
        return path;
      }

      open.delete(current);
      const curNode = this.waypointMap.get(current);
      if (!curNode) continue;

      for (const nbId of curNode.neighbors) {
        const nbNode = this.waypointMap.get(nbId);
        if (!nbNode || this.isSafeRoomWaypoint(nbNode)) continue;
        if (isDoorLockedBetween && isDoorLockedBetween(curNode.roomId, nbNode.roomId)) {
          continue;
        }
        const tentativeG = (gScore.get(current) ?? Infinity) + this.heuristic(current, nbId);
        if (tentativeG < (gScore.get(nbId) ?? Infinity)) {
          cameFrom.set(nbId, current);
          gScore.set(nbId, tentativeG);
          fScore.set(nbId, tentativeG + this.heuristic(nbId, goalWpId));
          open.add(nbId);
        }
      }
    }

    return [];
  }

  private heuristic(aId: string, bId: string): number {
    const a = this.waypointMap.get(aId);
    const b = this.waypointMap.get(bId);
    if (!a || !b) return 999;
    return Math.hypot(a.x - b.x, (a.y - b.y) * 1.5, a.z - b.z);
  }
}
