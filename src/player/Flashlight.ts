import * as THREE from 'three';
import { GAME_CONFIG } from '../config';

// Đèn pin SpotLight gắn theo góc nhìn người chơi, bóng đổ mềm và nón ánh sáng giả thể tích

export class Flashlight {
  public readonly light: THREE.SpotLight;
  public readonly target = new THREE.Object3D();

  public isOn = true;
  public hasFlashlight = true;
  public battery = 100; // 0..100

  private flickerTimer = 0;
  private proximityFlicker = 0;
  private reduceFlash = false;
  private volumetricEnabled = true;
  private readonly forwardVec = new THREE.Vector3();
  private readonly beamTargetVec = new THREE.Vector3();

  private readonly beamCone: THREE.Mesh;
  private readonly beamGeo: THREE.ConeGeometry;
  private readonly beamMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    const angleRad = THREE.MathUtils.degToRad(GAME_CONFIG.FLASHLIGHT_ANGLE_DEG);
    this.light = new THREE.SpotLight(
      0xffe9c7,
      GAME_CONFIG.FLASHLIGHT_INTENSITY_MAX,
      GAME_CONFIG.FLASHLIGHT_DISTANCE,
      angleRad,
      GAME_CONFIG.FLASHLIGHT_PENUMBRA,
      1.6,
    );
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 1024;
    this.light.shadow.mapSize.height = 1024;
    this.light.shadow.camera.near = 0.2;
    this.light.shadow.camera.far = GAME_CONFIG.FLASHLIGHT_DISTANCE;
    this.light.shadow.bias = -0.0005;
    this.light.shadow.normalBias = 0.02;
    this.light.shadow.radius = 2.5;

    this.light.target = this.target;
    scene.add(this.light);
    scene.add(this.target);

    // Chùm sương sáng giả thể tích rất nhẹ theo nón đèn pin
    const coneLen = 4.6;
    const coneRadius = Math.tan(angleRad * 0.85) * coneLen;
    this.beamGeo = new THREE.ConeGeometry(coneRadius, coneLen, 20, 1, true);
    this.beamGeo.translate(0, -coneLen * 0.5, 0);
    this.beamGeo.rotateX(Math.PI * 0.5);
    this.beamMat = new THREE.MeshBasicMaterial({
      color: 0xffeed2,
      transparent: true,
      opacity: 0.028,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.beamCone = new THREE.Mesh(this.beamGeo, this.beamMat);
    this.beamCone.userData.ignoreRaycast = true;
    this.beamCone.renderOrder = 5;
    this.beamCone.visible = false;
    scene.add(this.beamCone);
  }

  public setShadowQuality(enabled: boolean, mapSize: number, volumetric = true): void {
    this.light.castShadow = enabled;
    this.light.shadow.radius = mapSize >= 2048 ? 3.5 : 2.2;
    this.volumetricEnabled = volumetric;
    if (
      this.light.shadow.mapSize.width !== mapSize ||
      this.light.shadow.mapSize.height !== mapSize
    ) {
      this.light.shadow.mapSize.set(mapSize, mapSize);
      this.light.shadow.map?.dispose();
      this.light.shadow.map = null;
    }
  }

  public setReduceFlash(reduce: boolean): void {
    this.reduceFlash = reduce;
  }

  public setProximityFlicker(amount01: number): void {
    this.proximityFlicker = Math.max(0, Math.min(1, amount01));
  }

  public toggle(): boolean {
    if (!this.hasFlashlight) return false;
    if (this.battery <= 0) {
      this.isOn = false;
      return false;
    }
    this.isOn = !this.isOn;
    return this.isOn;
  }

  public addBattery(amount: number): void {
    this.battery = Math.min(100, Math.max(0, this.battery + amount));
  }

  public update(dt: number, camera: THREE.PerspectiveCamera, bobOffsetX: number, bobOffsetY: number): void {
    // Tiêu hao pin: 100% trong 300 giây
    if (this.hasFlashlight && this.isOn && this.battery > 0) {
      const drainPerSec = 100 / GAME_CONFIG.FLASHLIGHT_DRAIN_SECONDS;
      this.battery = Math.max(0, this.battery - drainPerSec * dt);
      if (this.battery <= 0) {
        this.isOn = false;
      }
    }

    // Đặt vị trí đèn hơi lệch tay phải và lắc nhẹ theo bước đi
    this.forwardVec.set(0, 0, -1).applyQuaternion(camera.quaternion);
    this.light.position.copy(camera.position);
    this.light.position.y -= 0.08 - bobOffsetY * 0.6;
    this.light.position.x += bobOffsetX * 0.5;

    this.target.position.copy(this.light.position).addScaledVector(this.forwardVec, 5);

    if (!this.hasFlashlight || !this.isOn || this.battery <= 0) {
      this.light.intensity = 0;
      this.beamCone.visible = false;
      return;
    }

    let intensity = GAME_CONFIG.FLASHLIGHT_INTENSITY_MAX;
    this.flickerTimer += dt;

    if (this.battery < GAME_CONFIG.FLASHLIGHT_LOW_BATTERY_THRESHOLD) {
      const ratio = this.battery / GAME_CONFIG.FLASHLIGHT_LOW_BATTERY_THRESHOLD;
      intensity *= 0.45 + 0.55 * ratio;

      if (!this.reduceFlash) {
        const pulse = Math.sin(this.flickerTimer * 23) * Math.sin(this.flickerTimer * 7.5);
        if (pulse > 0.72) {
          intensity *= 0.2;
        }
      }
    }

    // Chập chờn khi ma ở gần
    if (this.proximityFlicker > 0.05) {
      if (this.reduceFlash) {
        intensity *= 0.75 + 0.2 * Math.sin(this.flickerTimer * 6);
      } else {
        const wave =
          Math.sin(this.flickerTimer * 31) * Math.sin(this.flickerTimer * 13.7);
        if (wave > 0.55 - this.proximityFlicker * 0.35) {
          intensity *= Math.max(0.08, 1 - this.proximityFlicker * 0.85);
        }
      }
    }

    this.light.intensity = intensity;

    // Cập nhật chùm sương sáng giả thể tích
    if (this.volumetricEnabled && !this.reduceFlash) {
      this.beamCone.visible = true;
      this.beamCone.position.copy(this.light.position).addScaledVector(this.forwardVec, 0.22);
      this.beamTargetVec.copy(this.light.position).addScaledVector(this.forwardVec, 4);
      this.beamCone.lookAt(this.beamTargetVec);
      this.beamMat.opacity = 0.024 * (intensity / GAME_CONFIG.FLASHLIGHT_INTENSITY_MAX);
    } else {
      this.beamCone.visible = false;
    }
  }

  public dispose(scene: THREE.Scene): void {
    this.light.shadow.map?.dispose();
    this.beamGeo.dispose();
    this.beamMat.dispose();
    scene.remove(this.beamCone);
    scene.remove(this.light);
    scene.remove(this.target);
  }
}
