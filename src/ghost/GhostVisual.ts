import * as THREE from 'three';
import { GAME_CONFIG } from '../config';
import { GhostState, WaypointDef } from '../types';

// Tạo hình khối procedural cho thực thể "Cái Bóng" và khung debug đường đi / tầm nhìn

export class GhostVisual {
  public readonly root = new THREE.Group();
  public readonly debugRoot = new THREE.Group();

  private readonly bodyGroup = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly cloakMat: THREE.MeshStandardMaterial;
  private readonly eyeMat: THREE.MeshBasicMaterial;
  private readonly auraLight: THREE.PointLight;

  private readonly pathLine: THREE.Line;
  private readonly coneLine: THREE.LineLoop;
  private readonly hearCircle: THREE.LineLoop;
  private readonly pathGeo: THREE.BufferGeometry;
  private readonly coneGeo: THREE.BufferGeometry;
  private readonly hearGeo: THREE.BufferGeometry;
  private readonly coneMat: THREE.LineBasicMaterial;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private animTime = 0;

  constructor(scene: THREE.Scene) {
    this.root.name = 'ghost_cai_bong';
    this.root.visible = false;

    this.cloakMat = new THREE.MeshStandardMaterial({
      color: 0x09090d,
      roughness: 0.94,
      metalness: 0.08,
      emissive: 0x090204,
      emissiveIntensity: 0.35,
    });
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x15131a,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.materials.push(this.cloakMat, innerMat, this.eyeMat);

    // Phần tà áo rách bên dưới (chiều cao tổng ~2.08 m, vừa vặn qua cửa 2.1 m)
    const skirtGeo = new THREE.CylinderGeometry(0.16, 0.39, 1.32, 10, 1, false);
    this.geometries.push(skirtGeo);
    const skirt = new THREE.Mesh(skirtGeo, this.cloakMat);
    skirt.position.y = 0.68;
    skirt.castShadow = true;
    this.bodyGroup.add(skirt);

    // Thân trên gầy gò hơi khom
    const torsoGeo = new THREE.BoxGeometry(0.36, 0.52, 0.22);
    this.geometries.push(torsoGeo);
    const torso = new THREE.Mesh(torsoGeo, innerMat);
    torso.position.set(0, 1.46, 0.03);
    torso.rotation.x = 0.14;
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    // Khăn choàng vai
    const cowlGeo = new THREE.ConeGeometry(0.31, 0.42, 8);
    this.geometries.push(cowlGeo);
    const cowl = new THREE.Mesh(cowlGeo, this.cloakMat);
    cowl.position.set(0, 1.62, 0.01);
    this.bodyGroup.add(cowl);

    // Đầu nghiêng kỳ dị + hai mắt đỏ mờ
    const headGeo = new THREE.SphereGeometry(0.145, 10, 8);
    this.geometries.push(headGeo);
    const head = new THREE.Mesh(headGeo, this.cloakMat);
    head.castShadow = true;
    this.headGroup.add(head);

    const eyeGeo = new THREE.BoxGeometry(0.032, 0.014, 0.02);
    this.geometries.push(eyeGeo);
    const eyeL = new THREE.Mesh(eyeGeo, this.eyeMat);
    eyeL.position.set(-0.048, 0.02, 0.132);
    const eyeR = new THREE.Mesh(eyeGeo, this.eyeMat);
    eyeR.position.set(0.048, 0.02, 0.132);
    this.headGroup.add(eyeL, eyeR);

    this.headGroup.position.set(0, 1.88, 0.08);
    this.headGroup.rotation.z = 0.16;
    this.bodyGroup.add(this.headGroup);

    // Hai cánh tay dài thõng xuống
    const armGeo = new THREE.BoxGeometry(0.07, 0.78, 0.07);
    const clawGeo = new THREE.ConeGeometry(0.035, 0.14, 5);
    this.geometries.push(armGeo, clawGeo);

    const buildArm = (armGroup: THREE.Group, side: -1 | 1) => {
      const armMesh = new THREE.Mesh(armGeo, innerMat);
      armMesh.position.y = -0.36;
      armMesh.castShadow = true;
      const claw = new THREE.Mesh(clawGeo, this.cloakMat);
      claw.position.y = -0.8;
      claw.rotation.x = Math.PI;
      armGroup.add(armMesh, claw);
      armGroup.position.set(side * 0.23, 1.66, 0.05);
      this.bodyGroup.add(armGroup);
    };
    buildArm(this.leftArm, -1);
    buildArm(this.rightArm, 1);

    // Ánh đỏ rất yếu quanh thực thể để dễ nhận biết trong hành lang tối
    this.auraLight = new THREE.PointLight(0x7f1d1d, 0.55, 3.6, 2);
    this.auraLight.position.set(0, 1.55, 0.2);
    this.bodyGroup.add(this.auraLight);

    this.root.add(this.bodyGroup);
    this.root.traverse((obj) => {
      obj.userData.ignoreRaycast = true;
    });
    scene.add(this.root);

    // === DEBUG: ĐƯỜNG ĐI A* & TẦM NHÌN / TẦM NGHE ===
    this.pathGeo = new THREE.BufferGeometry();
    const pathMat = new THREE.LineBasicMaterial({ color: 0xf43f5e });
    this.materials.push(pathMat);
    this.pathLine = new THREE.Line(this.pathGeo, pathMat);
    this.pathLine.frustumCulled = false;

    this.coneGeo = new THREE.BufferGeometry();
    this.coneMat = new THREE.LineBasicMaterial({ color: 0xf59e0b });
    this.materials.push(this.coneMat);
    this.coneLine = new THREE.LineLoop(this.coneGeo, this.coneMat);
    this.coneLine.frustumCulled = false;

    this.hearGeo = new THREE.BufferGeometry();
    const hearMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    this.materials.push(hearMat);
    this.hearCircle = new THREE.LineLoop(this.hearGeo, hearMat);
    this.hearCircle.frustumCulled = false;

    this.debugRoot.add(this.pathLine, this.coneLine, this.hearCircle);
    this.debugRoot.traverse((obj) => {
      obj.userData.ignoreRaycast = true;
    });
    this.debugRoot.visible = false;
    scene.add(this.debugRoot);
  }

  public setDebugVisible(visible: boolean): void {
    this.debugRoot.visible = visible;
  }

  public update(
    dt: number,
    position: THREE.Vector3,
    yaw: number,
    state: GhostState,
    isStunned: boolean,
    visible: boolean,
  ): void {
    this.root.visible = visible;
    if (!visible) return;

    this.animTime += dt;
    this.root.position.copy(position);
    this.root.rotation.y = yaw;

    if (isStunned) {
      // Khựng run rẩy khi bị đèn pin rọi trúng
      this.bodyGroup.position.y = -0.1;
      this.bodyGroup.rotation.z = Math.sin(this.animTime * 42) * 0.09;
      this.headGroup.rotation.z = Math.cos(this.animTime * 35) * 0.3;
      this.leftArm.rotation.x = -0.85;
      this.rightArm.rotation.x = -0.85;
      this.eyeMat.color.setHex(0xfca5a5);
      this.auraLight.intensity = 0.2;
      return;
    }

    const isChase = state === GhostState.Chase;
    const speed = isChase ? 9.5 : 3.2;
    this.bodyGroup.position.y = Math.sin(this.animTime * speed) * 0.035;
    this.bodyGroup.rotation.z = Math.sin(this.animTime * (speed * 0.5)) * 0.025;
    this.headGroup.rotation.z = 0.16 + Math.sin(this.animTime * 2.1) * 0.08;

    if (isChase) {
      this.leftArm.rotation.x = -0.75 + Math.sin(this.animTime * 11) * 0.25;
      this.rightArm.rotation.x = -0.75 - Math.sin(this.animTime * 11) * 0.25;
      this.eyeMat.color.setHex(0xff2040);
      this.auraLight.intensity = 0.95;
    } else {
      this.leftArm.rotation.x = -0.15 + Math.sin(this.animTime * 2.4) * 0.08;
      this.rightArm.rotation.x = -0.15 - Math.sin(this.animTime * 2.4) * 0.08;
      this.eyeMat.color.setHex(0xb91c1c);
      this.auraLight.intensity = state === GhostState.Scare ? 0.85 : 0.45;
    }
  }

  public updateDebugVisuals(
    position: THREE.Vector3,
    yaw: number,
    state: GhostState,
    path: WaypointDef[],
    pathIndex: number,
    sightRange: number,
  ): void {
    if (!this.debugRoot.visible) return;

    // 1. Đường đi A*
    const pathPts: number[] = [position.x, position.y + 0.35, position.z];
    for (let i = Math.max(0, pathIndex); i < path.length; i++) {
      pathPts.push(path[i].x, path[i].y + 0.35, path[i].z);
    }
    this.pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(pathPts, 3));
    this.pathGeo.computeBoundingSphere();

    // 2. Hình nón tầm nhìn 90°
    const halfAngle = THREE.MathUtils.degToRad(GAME_CONFIG.GHOST_SIGHT_ANGLE_DEG * 0.5);
    const conePts: number[] = [position.x, position.y + 0.16, position.z];
    const segs = 12;
    for (let i = 0; i <= segs; i++) {
      const a = yaw - halfAngle + (2 * halfAngle * i) / segs;
      conePts.push(
        position.x + Math.sin(a) * sightRange,
        position.y + 0.16,
        position.z + Math.cos(a) * sightRange,
      );
    }
    this.coneGeo.setAttribute('position', new THREE.Float32BufferAttribute(conePts, 3));
    this.coneGeo.computeBoundingSphere();
    this.coneMat.color.setHex(state === GhostState.Chase ? 0xef4444 : 0xf59e0b);

    // 3. Vòng nghe tiếng chạy
    const hearPts: number[] = [];
    const hSegs = 24;
    for (let i = 0; i < hSegs; i++) {
      const a = (Math.PI * 2 * i) / hSegs;
      hearPts.push(
        position.x + Math.cos(a) * GAME_CONFIG.GHOST_HEAR_SPRINT,
        position.y + 0.12,
        position.z + Math.sin(a) * GAME_CONFIG.GHOST_HEAR_SPRINT,
      );
    }
    this.hearGeo.setAttribute('position', new THREE.Float32BufferAttribute(hearPts, 3));
    this.hearGeo.computeBoundingSphere();
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.root);
    scene.remove(this.debugRoot);
    this.pathGeo.dispose();
    this.coneGeo.dispose();
    this.hearGeo.dispose();
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}
