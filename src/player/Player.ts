import * as THREE from 'three';
import { AudioManager } from '../audio/AudioManager';
import { GAME_CONFIG } from '../config';
import { InputManager } from '../input/Input';
import { TouchControls } from '../input/TouchControls';
import { FloorSurface, RoomId } from '../types';
import { CollisionSystem } from './Collision';
import { Flashlight } from './Flashlight';

// Điều khiển nhân vật góc nhìn thứ nhất, thể lực, cúi, bước chân và đèn pin

export class Player {
  public readonly position = new THREE.Vector3(
    GAME_CONFIG.PLAYER_START_POS.x,
    GAME_CONFIG.PLAYER_START_POS.y,
    GAME_CONFIG.PLAYER_START_POS.z,
  );
  public yaw = GAME_CONFIG.PLAYER_START_YAW;
  public pitch = 0;

  public stamina: number = GAME_CONFIG.STAMINA_MAX_SECONDS;
  public staminaExhausted = false;
  public isMoving = false;
  public isCrouching = false;
  public isSprinting = false;
  public isHiding = false;
  public isHoldingBreath = false;
  public hidingSpotId: string | null = null;
  public hidingSpotLabel: string | null = null;
  public breathRemaining: number = GAME_CONFIG.HOLD_BREATH_MAX_SECONDS;
  public breathCooldown = 0;
  public noclip = false;
  public currentSurface: FloorSurface = FloorSurface.Wood;
  public currentRoomId: RoomId = 'bedroom';

  public readonly flashlight: Flashlight;

  private crouchToggle = false;
  private eyeHeight: number = GAME_CONFIG.PLAYER_EYE_STAND;
  private preHidePos = new THREE.Vector3();
  private preHideYaw = 0;
  private hideBaseYaw = 0;
  private stepTimer = 0;
  private bobTimer = 0;
  private bobX = 0;
  private bobY = 0;
  private stuckTimer = 0;
  private shakeIntensity = 0;
  private shakeTime = 0;
  private reduceFlash = false;

  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly forwardVec = new THREE.Vector3();
  private readonly rightVec = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.flashlight = new Flashlight(scene);
  }

  public reset(): void {
    this.position.set(
      GAME_CONFIG.PLAYER_START_POS.x,
      GAME_CONFIG.PLAYER_START_POS.y,
      GAME_CONFIG.PLAYER_START_POS.z,
    );
    this.yaw = GAME_CONFIG.PLAYER_START_YAW;
    this.pitch = 0;
    this.stamina = GAME_CONFIG.STAMINA_MAX_SECONDS;
    this.staminaExhausted = false;
    this.isMoving = false;
    this.isCrouching = false;
    this.crouchToggle = false;
    this.isSprinting = false;
    this.isHiding = false;
    this.isHoldingBreath = false;
    this.hidingSpotId = null;
    this.hidingSpotLabel = null;
    this.breathRemaining = GAME_CONFIG.HOLD_BREATH_MAX_SECONDS;
    this.breathCooldown = 0;
    this.eyeHeight = GAME_CONFIG.PLAYER_EYE_STAND;
    this.stuckTimer = 0;
    this.shakeIntensity = 0;
    this.flashlight.battery = 100;
    this.flashlight.isOn = false;
    this.flashlight.hasFlashlight = false;
  }

  public setReduceFlash(reduce: boolean): void {
    this.reduceFlash = reduce;
    this.flashlight.setReduceFlash(reduce);
    if (reduce) {
      this.shakeIntensity = 0;
    }
  }

  public triggerCameraShake(intensity: number): void {
    if (this.reduceFlash) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public enterHidingSpot(
    spotId: string,
    label: string,
    insideX: number,
    insideY: number,
    insideZ: number,
    faceYaw: number,
  ): void {
    this.preHidePos.copy(this.position);
    this.preHideYaw = this.yaw;
    this.position.set(insideX, insideY, insideZ);
    this.hideBaseYaw = faceYaw;
    this.yaw = faceYaw;
    this.pitch = 0;
    this.isHiding = true;
    this.isSprinting = false;
    this.isMoving = false;
    this.hidingSpotId = spotId;
    this.hidingSpotLabel = label;
    this.flashlight.isOn = false;
  }

  public exitHidingSpot(collision: CollisionSystem): void {
    if (!this.isHiding) return;
    this.isHiding = false;
    this.isHoldingBreath = false;
    this.hidingSpotId = null;
    this.hidingSpotLabel = null;
    if (collision.isPositionValid(this.preHidePos.x, this.preHidePos.y, this.preHidePos.z)) {
      this.position.copy(this.preHidePos);
    } else {
      const safe = collision.findNearestSafeSpot(this.preHidePos.x, this.preHidePos.y, this.preHidePos.z);
      this.position.set(safe.x, safe.y, safe.z);
    }
    this.yaw = this.preHideYaw;
    this.pitch = 0;
  }

  public toggleCrouch(): void {
    if (this.isHiding) return;
    this.crouchToggle = !this.crouchToggle;
  }

  public setTeleport(x: number, y: number, z: number): void {
    this.isHiding = false;
    this.isHoldingBreath = false;
    this.hidingSpotId = null;
    this.hidingSpotLabel = null;
    this.position.set(x, y, z);
    this.stuckTimer = 0;
  }

  public update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    input: InputManager,
    touch: TouchControls,
    collision: CollisionSystem,
    audio: AudioManager,
  ): { justGasped: boolean } {
    let justGasped = false;

    // 1. Xoay camera từ chuột + cảm ứng (giới hạn góc nhìn qua khe nếu đang trốn)
    const mouseLook = input.consumeLookDelta();
    const touchLook = touch.consumeLookDelta();
    this.yaw -= mouseLook.dx + touchLook.dx;
    this.pitch -= mouseLook.dy + touchLook.dy;

    if (this.isHiding) {
      const maxYaw = THREE.MathUtils.degToRad(GAME_CONFIG.HIDE_PEEK_MAX_YAW_DEG);
      const maxPitch = THREE.MathUtils.degToRad(GAME_CONFIG.HIDE_PEEK_MAX_PITCH_DEG);
      const relYaw = Math.atan2(
        Math.sin(this.yaw - this.hideBaseYaw),
        Math.cos(this.yaw - this.hideBaseYaw),
      );
      const clampedRel = Math.max(-maxYaw, Math.min(maxYaw, relYaw));
      this.yaw = this.hideBaseYaw + clampedRel;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    } else {
      const maxPitch = Math.PI * 0.47;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    }

    // 2. Xử lý nín thở khi trốn (giữ phím H hoặc nút mobile)
    if (this.breathCooldown > 0) {
      this.breathCooldown = Math.max(0, this.breathCooldown - dt);
    }
    const wantsHoldBreath =
      this.isHiding && (input.isHoldingBreathKey() || touch.holdBreath) && this.breathCooldown <= 0;

    if (wantsHoldBreath && this.breathRemaining > 0) {
      this.isHoldingBreath = true;
      this.breathRemaining = Math.max(0, this.breathRemaining - dt);
      if (this.breathRemaining <= 0) {
        this.isHoldingBreath = false;
        this.breathCooldown = GAME_CONFIG.BREATH_RECOVER_SECONDS;
        justGasped = true;
        audio.playGasp();
      }
    } else {
      this.isHoldingBreath = false;
      const recoverRate = GAME_CONFIG.HOLD_BREATH_MAX_SECONDS / GAME_CONFIG.BREATH_RECOVER_SECONDS;
      this.breathRemaining = Math.min(
        GAME_CONFIG.HOLD_BREATH_MAX_SECONDS,
        this.breathRemaining + recoverRate * dt,
      );
    }

    // 3. Xác định trạng thái cúi
    this.isCrouching = !this.isHiding && (this.crouchToggle || input.isHoldingCrouchKey());

    // 4. Vector di chuyển tổng hợp PC + Mobile
    const pcMove = input.getMoveAxes();
    const moveFwd = this.isHiding ? 0 : Math.max(-1, Math.min(1, pcMove.forward + touch.moveForward));
    const moveRight = this.isHiding ? 0 : Math.max(-1, Math.min(1, pcMove.right + touch.moveRight));
    const wantsMove = !this.isHiding && (Math.abs(moveFwd) > 0.05 || Math.abs(moveRight) > 0.05);
    this.isMoving = wantsMove;

    // 4. Thể lực & chạy
    const wantsSprint = (input.isSprinting() || touch.autoSprint) && !this.isCrouching && wantsMove;
    if (wantsSprint && !this.staminaExhausted && this.stamina > 0) {
      this.isSprinting = true;
      this.stamina = Math.max(0, this.stamina - dt);
      if (this.stamina <= 0) {
        this.staminaExhausted = true;
        this.isSprinting = false;
      }
    } else {
      this.isSprinting = false;
      const recoverRate =
        GAME_CONFIG.STAMINA_MAX_SECONDS / GAME_CONFIG.STAMINA_RECOVER_SECONDS;
      this.stamina = Math.min(GAME_CONFIG.STAMINA_MAX_SECONDS, this.stamina + recoverRate * dt);
      if (this.staminaExhausted && this.stamina >= GAME_CONFIG.STAMINA_MAX_SECONDS * 0.4) {
        this.staminaExhausted = false;
      }
    }

    // 5. Tính vận tốc
    const speed = this.noclip
      ? GAME_CONFIG.PLAYER_NOCLIP_SPEED
      : this.isCrouching
        ? GAME_CONFIG.PLAYER_CROUCH_SPEED
        : this.isSprinting
          ? GAME_CONFIG.PLAYER_SPRINT_SPEED
          : GAME_CONFIG.PLAYER_WALK_SPEED;

    this.forwardVec.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.rightVec.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    let dx = this.forwardVec.x * moveFwd + this.rightVec.x * moveRight;
    let dz = this.forwardVec.z * moveFwd + this.rightVec.z * moveRight;
    const horizLen = Math.hypot(dx, dz);
    if (horizLen > 1) {
      dx /= horizLen;
      dz /= horizLen;
    }

    if (this.noclip) {
      // Noclip di chuyển tự do theo hướng nhìn kể cả trục Y
      const lookY = Math.sin(this.pitch) * moveFwd;
      this.position.x += dx * speed * dt;
      this.position.y += lookY * speed * dt;
      this.position.z += dz * speed * dt;
    } else if (!this.isHiding) {
      const targetX = this.position.x + dx * speed * dt;
      const targetZ = this.position.z + dz * speed * dt;
      const playerH = this.isCrouching
        ? GAME_CONFIG.PLAYER_CROUCH_HEIGHT
        : GAME_CONFIG.PLAYER_STAND_HEIGHT;

      const resolved = collision.resolveMove(
        targetX,
        this.position.y,
        targetZ,
        GAME_CONFIG.PLAYER_RADIUS,
        playerH,
      );

      // Kiểm tra bị kẹt quá 3 giây (cố di chuyển nhưng vị trí không đổi & đang va chạm)
      const movedDist = Math.hypot(resolved.x - this.position.x, resolved.z - this.position.z);
      if (wantsMove && resolved.collided && movedDist < 0.002 * (dt * 60)) {
        this.stuckTimer += dt;
        if (this.stuckTimer >= GAME_CONFIG.STUCK_THRESHOLD_SECONDS) {
          const safe = collision.findNearestSafeSpot(
            this.position.x,
            this.position.y,
            this.position.z,
          );
          this.position.set(safe.x, safe.y, safe.z);
          this.stuckTimer = 0;
        }
      } else {
        this.stuckTimer = 0;
        this.position.set(resolved.x, resolved.y, resolved.z);
      }
      this.currentSurface = resolved.surface;
    }

    // 6. Chuyển động mắt mượt khi cúi, trốn tủ & lắc nhẹ khi bước
    const targetEye = this.isHiding
      ? this.hidingSpotId === 'prop_under_counter_hide'
        ? GAME_CONFIG.PLAYER_EYE_CROUCH
        : 1.45
      : this.isCrouching
        ? GAME_CONFIG.PLAYER_EYE_CROUCH
        : GAME_CONFIG.PLAYER_EYE_STAND;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, targetEye, 11, dt);

    if (wantsMove && !this.isHiding && !this.noclip) {
      const bobFreq = this.isSprinting ? 12.5 : this.isCrouching ? 5.5 : 8.5;
      const baseAmp = this.isSprinting ? 0.042 : this.isCrouching ? 0.016 : 0.026;
      const bobAmp = this.reduceFlash ? baseAmp * 0.35 : baseAmp;
      this.bobTimer += dt * bobFreq;
      this.bobX = Math.cos(this.bobTimer * 0.5) * bobAmp * 0.6;
      this.bobY = Math.sin(this.bobTimer) * bobAmp;

      const stepInterval = this.isSprinting ? 0.34 : this.isCrouching ? 0.66 : 0.48;
      this.stepTimer += dt;
      if (this.stepTimer >= stepInterval) {
        this.stepTimer = 0;
        audio.playFootstep(this.currentSurface, this.isSprinting, this.isCrouching);
      }
    } else {
      this.bobX = THREE.MathUtils.damp(this.bobX, 0, 10, dt);
      this.bobY = THREE.MathUtils.damp(this.bobY, 0, 10, dt);
      this.stepTimer = 0.25;
    }

    // Rung camera nhẹ khi hoảng sợ/bị bắt (tắt khi Giảm chớp sáng & rung)
    let shakeOffX = 0;
    let shakeOffY = 0;
    let shakeRoll = 0;
    if (!this.reduceFlash && this.shakeIntensity > 0.001) {
      this.shakeTime += dt * 42;
      shakeOffX = Math.sin(this.shakeTime * 1.3) * this.shakeIntensity * 0.5;
      shakeOffY = Math.cos(this.shakeTime * 1.9) * this.shakeIntensity * 0.5;
      shakeRoll = Math.sin(this.shakeTime * 1.7) * this.shakeIntensity * 0.45;
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 6.5, dt);
    } else {
      this.shakeIntensity = 0;
    }

    // 7. Cập nhật camera và listener âm thanh
    camera.position.set(
      this.position.x + shakeOffX,
      this.position.y + this.eyeHeight + this.bobY + shakeOffY,
      this.position.z,
    );
    this.euler.set(this.pitch, this.yaw, shakeRoll, 'YXZ');
    camera.quaternion.setFromEuler(this.euler);

    camera.getWorldDirection(this.forwardVec);
    audio.updateListener(
      camera.position.x,
      camera.position.y,
      camera.position.z,
      this.forwardVec.x,
      this.forwardVec.y,
      this.forwardVec.z,
    );

    // 8. Đèn pin
    this.flashlight.update(dt, camera, this.bobX, this.bobY);

    return { justGasped };
  }

  public dispose(scene: THREE.Scene): void {
    this.flashlight.dispose(scene);
  }
}
