import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GAME_CONFIG } from '../config';
import { WORLD_DOCUMENT_PICKUPS } from '../inventory/documentData';
import { WORLD_PICKUPS, WorldPickupDef } from '../inventory/itemData';
import { AABB, DoorDef, RoomId, WallDef } from '../types';
import {
  DOORS,
  FLOOR_ZONES,
  LIGHTS,
  PROPS,
  ROOMS,
  STAIR_RAMPS,
  WALLS,
  WAYPOINTS,
} from './layoutData';
import { MaterialLibrary } from './Materials';
import { createPropMesh } from './Props';

interface ManagedLight {
  id: string;
  roomId: RoomId;
  x: number;
  y: number;
  z: number;
  baseIntensity: number;
  flicker: boolean;
  light: THREE.PointLight;
}

export interface RuntimeDoor {
  def: DoorDef;
  isOpen: boolean;
  locked: boolean;
  isJammed: boolean;
  pivot: THREE.Group;
  targetAngle: number;
  collider: AABB;
}

export class World {
  public readonly root = new THREE.Group();
  public readonly materials: MaterialLibrary;
  public readonly colliders: AABB[] = [];
  public readonly roomGroups = new Map<RoomId, THREE.Group>();
  public readonly doors = new Map<string, RuntimeDoor>();
  public readonly pickupMeshes = new Map<string, THREE.Group>();
  public readonly docMeshes = new Map<string, THREE.Group>();
  public readonly altarRelicMeshes = new Map<string, THREE.Group>();
  public readonly roomLightMuted = new Set<RoomId>();

  private geometries: THREE.BufferGeometry[] = [];
  private managedLights: ManagedLight[] = [];
  private exteriorGroup = new THREE.Group();
  private debugCollidersGroup = new THREE.Group();
  private debugWaypointsGroup = new THREE.Group();
  private rescueBatteryMesh: THREE.Group | null = null;
  private lastVisibleRoom: RoomId | null = null;
  private flickerTime = 0;

  private readonly easelPos = new THREE.Vector3(10.6, 4.05, 11.0);
  private readonly camForward = new THREE.Vector3();
  private readonly toEasel = new THREE.Vector3();
  private readonly invisibleHitMaterial = new THREE.MeshBasicMaterial({ visible: false });

  private dustMesh: THREE.InstancedMesh | null = null;
  private dustGeo: THREE.BoxGeometry | null = null;
  private dustMat: THREE.MeshBasicMaterial | null = null;
  private dustEnabled = true;
  private dustTime = 0;
  private readonly dustCount = 56;
  private readonly dustOffsets: Float32Array = new Float32Array(56 * 3);
  private readonly dustDummy = new THREE.Object3D();

  constructor(maxAnisotropy: number) {
    this.materials = new MaterialLibrary(maxAnisotropy);
    this.root.name = 'HouseWorld';

    (Object.keys(ROOMS) as RoomId[]).forEach((roomId) => {
      const g = new THREE.Group();
      g.name = `room_${roomId}`;
      this.roomGroups.set(roomId, g);
      this.root.add(g);
    });

    this.buildFloorsAndCeilings();
    this.buildStairs();
    this.buildWalls();
    this.buildDoors();
    this.buildJammedAtticDoor();
    this.buildProps();
    this.buildWallSwitches();
    this.buildWorldPickups();
    this.buildWorldDocuments();
    this.buildAltarRelicSlots();
    this.buildRescueBattery();
    this.buildMoonlightExterior();
    this.buildLights();
    this.buildAtmosphericDust();
    this.buildDebugVisuals();

    this.updateRoomVisibility('bedroom');
  }

  private regGeo<T extends THREE.BufferGeometry>(geo: T): T {
    this.geometries.push(geo);
    return geo;
  }

  private getRoomGroup(roomId: RoomId): THREE.Group {
    return this.roomGroups.get(roomId) ?? this.root;
  }

  private getFloorMaterial(surface: string): THREE.Material {
    if (surface === 'tile') return this.materials.kitchenTile;
    if (surface === 'concrete') return this.materials.concrete;
    return this.materials.woodFloor;
  }

  private tagInteractable(obj: THREE.Object3D, interactId: string): void {
    obj.traverse((child) => {
      if (!child.userData.ignoreRaycast) {
        child.userData.interactId = interactId;
      }
    });
  }

  private buildFloorsAndCeilings(): void {
    const slabH = GAME_CONFIG.FLOOR_SLAB_THICKNESS;
    for (const fz of FLOOR_ZONES) {
      const w = fz.maxX - fz.minX;
      const d = fz.maxZ - fz.minZ;
      const cx = (fz.minX + fz.maxX) / 2;
      const cz = (fz.minZ + fz.maxZ) / 2;

      const geo = this.regGeo(new THREE.BoxGeometry(w, slabH, d));
      const mesh = new THREE.Mesh(geo, this.getFloorMaterial(fz.surface));
      mesh.position.set(cx, fz.y - slabH / 2, cz);
      mesh.receiveShadow = true;
      this.getRoomGroup(fz.roomId).add(mesh);
    }

    for (const room of Object.values(ROOMS)) {
      if (!room.hasCeiling) continue;
      const w = room.maxX - room.minX;
      const d = room.maxZ - room.minZ;
      const cx = (room.minX + room.maxX) / 2;
      const cz = (room.minZ + room.maxZ) / 2;

      const geo = this.regGeo(new THREE.BoxGeometry(w, 0.14, d));
      const ceiling = new THREE.Mesh(geo, this.materials.ceiling);
      ceiling.position.set(cx, room.y + GAME_CONFIG.CEILING_HEIGHT + 0.07, cz);
      ceiling.receiveShadow = true;
      this.getRoomGroup(room.id).add(ceiling);
    }
  }

  private buildStairs(): void {
    for (const ramp of STAIR_RAMPS) {
      const group = this.getRoomGroup(ramp.roomId);
      const mat = this.getFloorMaterial(ramp.surface);
      const w = ramp.maxX - ramp.minX;
      const cx = (ramp.minX + ramp.maxX) / 2;
      const totalDz = ramp.endZ - ramp.startZ;
      const totalDy = ramp.endY - ramp.startY;
      const stepDepth = Math.abs(totalDz) / ramp.stepCount;
      const stepHeight = Math.abs(totalDy) / ramp.stepCount;

      for (let i = 0; i < ramp.stepCount; i++) {
        const t = (i + 0.5) / ramp.stepCount;
        const z = ramp.startZ + totalDz * t;
        const yTop = ramp.startY + totalDy * ((i + 1) / ramp.stepCount);
        const h = stepHeight + 0.08;
        const geo = this.regGeo(new THREE.BoxGeometry(w, h, stepDepth + 0.02));
        const step = new THREE.Mesh(geo, mat);
        step.position.set(cx, yTop - h / 2, z);
        step.receiveShadow = true;
        step.castShadow = true;
        group.add(step);
      }

      const rampLen = Math.hypot(totalDz, totalDy);
      const angle = Math.atan2(totalDy, totalDz);
      const midZ = (ramp.startZ + ramp.endZ) / 2;
      const midY = (ramp.startY + ramp.endY) / 2;
      for (const sx of [ramp.minX + 0.04, ramp.maxX - 0.04]) {
        const beam = new THREE.Mesh(
          this.regGeo(new THREE.BoxGeometry(0.08, 0.18, rampLen)),
          this.materials.furnitureWood,
        );
        beam.position.set(sx, midY - 0.06, midZ);
        beam.rotation.x = -angle;
        group.add(beam);
      }
    }
  }

  private buildWalls(): void {
    // Gộp geometry tường tĩnh theo từng phòng và vật liệu để giảm số lượng draw call
    const buckets = new Map<
      string,
      { roomId: RoomId; mat: THREE.Material; geos: THREE.BufferGeometry[] }
    >();

    for (const wall of WALLS) {
      this.collectWallSegments(wall, buckets);
    }

    buckets.forEach((bucket) => {
      if (bucket.geos.length === 0) return;
      const merged =
        bucket.geos.length === 1 ? bucket.geos[0] : mergeGeometries(bucket.geos, false);
      if (bucket.geos.length > 1) {
        bucket.geos.forEach((g) => g.dispose());
      }
      if (!merged) return;

      this.regGeo(merged);
      const mesh = new THREE.Mesh(merged, bucket.mat);
      mesh.castShadow = bucket.mat !== this.materials.moonGlass;
      mesh.receiveShadow = true;
      this.getRoomGroup(bucket.roomId).add(mesh);
    });
  }

  private collectWallSegments(
    wall: WallDef,
    buckets: Map<string, { roomId: RoomId; mat: THREE.Material; geos: THREE.BufferGeometry[] }>,
  ): void {
    const dx = wall.x2 - wall.x1;
    const dz = wall.z2 - wall.z1;
    const length = Math.hypot(dx, dz);
    if (length < 0.01) return;

    const dirX = dx / length;
    const dirZ = dz / length;
    const thickness = wall.thickness ?? GAME_CONFIG.WALL_THICKNESS;
    const isAlongX = Math.abs(dx) >= Math.abs(dz);
    const baseMat =
      wall.material === 'concrete'
        ? this.materials.concrete
        : wall.material === 'wood'
          ? this.materials.furnitureWood
          : this.materials.plasterWall;

    const openings = [...(wall.openings ?? [])].sort((a, b) => a.startOffset - b.startOffset);

    const addWallBox = (
      startOff: number,
      endOff: number,
      botY: number,
      topY: number,
      addCollider: boolean,
      overrideMat?: THREE.Material,
    ) => {
      const segLen = endOff - startOff;
      const segH = topY - botY;
      if (segLen <= 0.01 || segH <= 0.01) return;

      const midOff = (startOff + endOff) / 2;
      const cx = wall.x1 + dirX * midOff;
      const cz = wall.z1 + dirZ * midOff;
      const cy = wall.y + (botY + topY) / 2;

      const sizeX = isAlongX ? segLen : thickness;
      const sizeZ = isAlongX ? thickness : segLen;

      const usedMat = overrideMat ?? baseMat;
      const geo = new THREE.BoxGeometry(sizeX, segH, sizeZ);
      geo.translate(cx, cy, cz);

      const key = `${wall.roomId}__${usedMat.uuid}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { roomId: wall.roomId, mat: usedMat, geos: [] };
        buckets.set(key, bucket);
      }
      bucket.geos.push(geo);

      if (addCollider) {
        this.colliders.push({
          id: `${wall.id}_${startOff.toFixed(2)}_${botY.toFixed(2)}`,
          minX: cx - sizeX / 2,
          maxX: cx + sizeX / 2,
          minY: wall.y + botY,
          maxY: wall.y + topY,
          minZ: cz - sizeZ / 2,
          maxZ: cz + sizeZ / 2,
          roomId: wall.roomId,
          blocksPlayer: true,
          blocksLight: overrideMat !== this.materials.moonGlass,
        });
      }
    };

    let cursor = 0;
    for (const op of openings) {
      if (op.startOffset > cursor) {
        addWallBox(cursor, op.startOffset, 0, wall.height, true);
      }
      if (op.bottomY > 0.01) {
        addWallBox(op.startOffset, op.startOffset + op.width, 0, op.bottomY, true);
      }
      if (op.topY < wall.height - 0.01) {
        addWallBox(op.startOffset, op.startOffset + op.width, op.topY, wall.height, false);
      }
      if (op.type === 'window') {
        addWallBox(
          op.startOffset,
          op.startOffset + op.width,
          op.bottomY,
          op.topY,
          true,
          this.materials.moonGlass,
        );
      }
      cursor = op.startOffset + op.width;
    }

    if (cursor < length) {
      addWallBox(cursor, length, 0, wall.height, true);
    }
  }

  private buildDoors(): void {
    for (const door of DOORS) {
      this.createDoorGeometry(door, false);
    }
  }

  private buildJammedAtticDoor(): void {
    // Cửa tủ kho bị kẹt cứng trên tầng 2 để kiểm thử trạng thái "kẹt"
    const jammedDef: DoorDef = {
      id: 'door_jammed_storage',
      roomA: 'storage_2f',
      roomB: 'storage_2f',
      x: 12.88,
      y: 3.0,
      z: 9.6,
      axis: 'z',
      width: 0.9,
      height: 2.0,
      locked: true,
      isOpen: false,
    };
    this.createDoorGeometry(jammedDef, true);
  }

  private createDoorGeometry(door: DoorDef, isJammed: boolean): void {
    const group = this.getRoomGroup(door.roomA);
    const frameGroup = new THREE.Group();
    frameGroup.name = `frame_${door.id}`;
    frameGroup.position.set(door.x, door.y, door.z);

    const frameThick = 0.07;
    const frameDepth = 0.24;
    const isZ = door.axis === 'z';
    const postGeo = this.regGeo(
      new THREE.BoxGeometry(isZ ? frameDepth : frameThick, door.height, isZ ? frameThick : frameDepth),
    );
    const halfW = door.width / 2;

    const postA = new THREE.Mesh(postGeo, this.materials.furnitureWood);
    postA.position.set(isZ ? 0 : -halfW, door.height / 2, isZ ? -halfW : 0);
    frameGroup.add(postA);

    const postB = new THREE.Mesh(postGeo, this.materials.furnitureWood);
    postB.position.set(isZ ? 0 : halfW, door.height / 2, isZ ? halfW : 0);
    frameGroup.add(postB);

    const lintelGeo = this.regGeo(
      new THREE.BoxGeometry(isZ ? frameDepth : door.width, frameThick, isZ ? door.width : frameDepth),
    );
    const lintel = new THREE.Mesh(lintelGeo, this.materials.furnitureWood);
    lintel.position.set(0, door.height - frameThick / 2, 0);
    frameGroup.add(lintel);

    const pivot = new THREE.Group();
    pivot.position.set(isZ ? 0 : -halfW, 0, isZ ? -halfW : 0);

    const leafW = door.width - 0.08;
    const leafGeo = this.regGeo(
      new THREE.BoxGeometry(isZ ? 0.06 : leafW, door.height - 0.04, isZ ? leafW : 0.06),
    );
    const leafMat = door.isMainExit ? this.materials.metalDark : this.materials.doorWood;
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(isZ ? 0 : leafW / 2, (door.height - 0.04) / 2, isZ ? leafW / 2 : 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    pivot.add(leaf);

    const handle = new THREE.Mesh(
      this.regGeo(new THREE.BoxGeometry(0.12, 0.05, 0.05)),
      this.materials.goldMetal,
    );
    handle.position.set(isZ ? 0 : leafW * 0.85, 1.0, isZ ? leafW * 0.85 : 0);
    pivot.add(handle);

    const sizeX = isZ ? 0.16 : door.width;
    const sizeZ = isZ ? door.width : 0.16;
    const collider: AABB = {
      id: `door_col_${door.id}`,
      minX: door.x - sizeX / 2,
      maxX: door.x + sizeX / 2,
      minY: door.y,
      maxY: door.y + door.height,
      minZ: door.z - sizeZ / 2,
      maxZ: door.z + sizeZ / 2,
      roomId: door.roomA,
      blocksPlayer: !door.isOpen,
      blocksLight: !door.isOpen,
    };
    this.colliders.push(collider);

    const initialOpen = Boolean(door.isOpen);
    const angle = initialOpen ? Math.PI * 0.46 : 0;
    pivot.rotation.y = angle;

    this.tagInteractable(pivot, door.id);

    frameGroup.add(pivot);
    this.doors.set(door.id, {
      def: door,
      isOpen: initialOpen,
      locked: door.locked,
      isJammed,
      pivot,
      targetAngle: angle,
      collider,
    });
    group.add(frameGroup);
  }

  public setDoorState(doorId: string, open: boolean, locked?: boolean): void {
    const rt = this.doors.get(doorId);
    if (!rt) return;
    if (typeof locked === 'boolean') {
      rt.locked = locked;
    }
    rt.isOpen = open;
    rt.targetAngle = open ? Math.PI * 0.46 : 0;
    rt.collider.blocksPlayer = !open;
    rt.collider.blocksLight = !open;
  }

  private buildProps(): void {
    for (const prop of PROPS) {
      const mesh = createPropMesh(prop, this.materials, this.geometries);
      if (prop.kind === 'altar') {
        // Vòng nghi lễ nằm dưới sàn không cản raycast vào bàn thờ hay vật phẩm
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material === this.materials.ritualCircle) {
            child.userData.ignoreRaycast = true;
          }
        });
      }
      if (prop.interactType && prop.interactType !== 'none') {
        this.tagInteractable(mesh, prop.id);
      }
      this.getRoomGroup(prop.roomId).add(mesh);

      if (prop.solid) {
        const rot = prop.rotationY ?? 0;
        const swap = Math.abs(Math.sin(rot)) > 0.7;
        const sx = swap ? prop.depth : prop.width;
        const sz = swap ? prop.width : prop.depth;

        this.colliders.push({
          id: `prop_col_${prop.id}`,
          minX: prop.x - sx / 2,
          maxX: prop.x + sx / 2,
          minY: prop.y,
          maxY: prop.y + prop.height,
          minZ: prop.z - sz / 2,
          maxZ: prop.z + sz / 2,
          roomId: prop.roomId,
          blocksPlayer: true,
          blocksLight: true,
        });
      }
    }
  }

  private buildWallSwitches(): void {
    const switches: Array<{ id: string; roomId: RoomId; x: number; y: number; z: number; rotY: number }> = [
      { id: 'switch_bedroom', roomId: 'bedroom', x: 4.88, y: 1.25, z: 1.75, rotY: -Math.PI / 2 },
      { id: 'switch_living_room', roomId: 'living_room', x: 7.12, y: 1.25, z: 2.2, rotY: Math.PI / 2 },
      { id: 'switch_kitchen', roomId: 'kitchen', x: 13.88, y: 1.25, z: 8.65, rotY: -Math.PI / 2 },
      { id: 'switch_study_2f', roomId: 'study_2f', x: 9.12, y: 4.25, z: 4.7, rotY: Math.PI / 2 },
    ];

    for (const sw of switches) {
      const g = new THREE.Group();
      const plate = new THREE.Mesh(
        this.regGeo(new THREE.BoxGeometry(0.14, 0.2, 0.04)),
        this.materials.bedding,
      );
      const toggle = new THREE.Mesh(
        this.regGeo(new THREE.BoxGeometry(0.05, 0.08, 0.05)),
        this.materials.metalDark,
      );
      toggle.position.z = 0.025;
      g.add(plate, toggle);
      g.position.set(sw.x, sw.y, sw.z);
      g.rotation.y = sw.rotY;
      this.tagInteractable(g, sw.id);
      this.getRoomGroup(sw.roomId).add(g);
    }
  }

  private buildWorldPickups(): void {
    for (const p of WORLD_PICKUPS) {
      const g = this.createPickupVisual(p);
      g.position.set(p.x, p.y, p.z);
      this.tagInteractable(g, p.id);
      this.pickupMeshes.set(p.id, g);
      this.getRoomGroup(p.roomId).add(g);
    }
  }

  private createPickupVisual(p: WorldPickupDef): THREE.Group {
    const g = new THREE.Group();
    g.name = p.id;

    // Hitbox vô hình giúp nhắm dễ hơn trên cả chuột và cảm ứng
    const hitGeo = this.regGeo(new THREE.BoxGeometry(0.32, 0.28, 0.32));
    const hitMesh = new THREE.Mesh(hitGeo, this.invisibleHitMaterial);
    hitMesh.position.y = 0.08;
    g.add(hitMesh);

    switch (p.visualKind) {
      case 'battery': {
        const body = new THREE.Mesh(
          this.regGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 10)),
          this.materials.batteryAccent,
        );
        body.position.y = 0.055;
        const cap = new THREE.Mesh(
          this.regGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10)),
          this.materials.goldMetal,
        );
        cap.position.y = 0.115;
        g.add(body, cap);
        break;
      }
      case 'key': {
        const ring = new THREE.Mesh(
          this.regGeo(new THREE.TorusGeometry(0.035, 0.01, 6, 12)),
          this.materials.goldMetal,
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(-0.04, 0.02, 0);
        const blade = new THREE.Mesh(
          this.regGeo(new THREE.BoxGeometry(0.11, 0.015, 0.022)),
          this.materials.goldMetal,
        );
        blade.position.set(0.035, 0.02, 0);
        g.add(ring, blade);
        break;
      }
      case 'music_box': {
        const box = new THREE.Mesh(
          this.regGeo(new THREE.BoxGeometry(0.22, 0.13, 0.16)),
          this.materials.furnitureWood,
        );
        box.position.y = 0.065;
        const trim = new THREE.Mesh(
          this.regGeo(new THREE.BoxGeometry(0.06, 0.04, 0.03)),
          this.materials.goldMetal,
        );
        trim.position.set(0, 0.08, 0.085);
        g.add(box, trim);
        break;
      }
      case 'bracelet': {
        const torus = new THREE.Mesh(
          this.regGeo(new THREE.TorusGeometry(0.055, 0.012, 8, 16)),
          this.materials.goldMetal,
        );
        torus.rotation.x = Math.PI / 2;
        torus.position.y = 0.018;
        g.add(torus);
        break;
      }
      case 'photo': {
        const frame = new THREE.Mesh(
          this.regGeo(new THREE.BoxGeometry(0.24, 0.28, 0.04)),
          this.materials.furnitureWood,
        );
        frame.position.y = 0.14;
        const inner = new THREE.Mesh(
          this.regGeo(new THREE.BoxGeometry(0.18, 0.22, 0.05)),
          this.materials.bedding,
        );
        inner.position.y = 0.14;
        g.add(frame, inner);
        break;
      }
      case 'doll': {
        const body = new THREE.Mesh(
          this.regGeo(new THREE.ConeGeometry(0.08, 0.24, 10)),
          this.materials.bedding,
        );
        body.position.y = 0.12;
        const head = new THREE.Mesh(
          this.regGeo(new THREE.SphereGeometry(0.065, 10, 10)),
          this.materials.candleWax,
        );
        head.position.y = 0.28;
        g.add(body, head);
        break;
      }
      default: {
        const box = new THREE.Mesh(
          this.regGeo(new THREE.BoxGeometry(0.14, 0.08, 0.14)),
          this.materials.metalDark,
        );
        box.position.y = 0.04;
        g.add(box);
      }
    }

    return g;
  }

  private buildWorldDocuments(): void {
    for (const d of WORLD_DOCUMENT_PICKUPS) {
      const g = new THREE.Group();
      g.name = d.id;

      const sheet = new THREE.Mesh(
        this.regGeo(new THREE.BoxGeometry(0.22, 0.012, 0.28)),
        this.materials.paperNote,
      );
      sheet.rotation.y = 0.18;
      g.add(sheet);

      const hit = new THREE.Mesh(
        this.regGeo(new THREE.BoxGeometry(0.32, 0.24, 0.34)),
        this.invisibleHitMaterial,
      );
      hit.position.y = 0.08;
      g.add(hit);

      g.position.set(d.x, d.y, d.z);
      this.tagInteractable(g, d.id);
      this.docMeshes.set(d.id, g);
      this.getRoomGroup(d.roomId).add(g);
    }
  }

  private buildAltarRelicSlots(): void {
    const ritualGroup = this.getRoomGroup('ritual_room');
    const slots: Array<{ id: string; visualKind: WorldPickupDef['visualKind']; x: number; z: number }> = [
      { id: 'music_box', visualKind: 'music_box', x: 5.2, z: 8.65 },
      { id: 'bracelet', visualKind: 'bracelet', x: 5.2, z: 9.0 },
      { id: 'family_photo', visualKind: 'photo', x: 5.2, z: 9.35 },
    ];

    for (const s of slots) {
      const dummyDef: WorldPickupDef = {
        id: `placed_${s.id}`,
        itemId: s.id,
        roomId: 'ritual_room',
        x: s.x,
        y: -1.94,
        z: s.z,
        label: s.id,
        visualKind: s.visualKind,
      };
      const mesh = this.createPickupVisual(dummyDef);
      mesh.position.set(s.x, -1.94, s.z);
      mesh.visible = false;
      this.altarRelicMeshes.set(s.id, mesh);
      ritualGroup.add(mesh);
    }
  }

  private buildRescueBattery(): void {
    const rescueDef: WorldPickupDef = {
      id: 'pickup_rescue_battery',
      itemId: 'battery',
      roomId: 'bedroom',
      x: 2.52,
      y: 0.67,
      z: 0.62,
      label: 'Pin dự phòng (cứu hộ)',
      visualKind: 'battery',
    };
    const g = this.createPickupVisual(rescueDef);
    g.position.set(rescueDef.x, rescueDef.y, rescueDef.z);
    g.visible = false;
    this.tagInteractable(g, rescueDef.id);
    this.rescueBatteryMesh = g;
    this.root.add(g);
  }

  public showRescueBatteryAt(x: number, y: number, z: number): void {
    if (!this.rescueBatteryMesh) return;
    this.rescueBatteryMesh.position.set(x, y, z);
    this.rescueBatteryMesh.visible = true;
  }

  public hideRescueBattery(): void {
    if (this.rescueBatteryMesh) {
      this.rescueBatteryMesh.visible = false;
    }
  }

  public setPickupVisible(pickupId: string, visible: boolean): void {
    const m = this.pickupMeshes.get(pickupId);
    if (m) m.visible = visible;
  }

  public setDocVisible(docPickupId: string, visible: boolean): void {
    const m = this.docMeshes.get(docPickupId);
    if (m) m.visible = visible;
  }

  public setAltarRelicVisible(relicId: string, visible: boolean): void {
    const m = this.altarRelicMeshes.get(relicId);
    if (m) m.visible = visible;
  }

  public resetInteractiveVisuals(): void {
    this.doors.forEach((rt, id) => {
      const def = DOORS.find((d) => d.id === id);
      if (def) {
        rt.locked = def.locked;
        rt.isOpen = Boolean(def.isOpen);
        rt.targetAngle = rt.isOpen ? Math.PI * 0.46 : 0;
        rt.pivot.rotation.y = rt.targetAngle;
        rt.collider.blocksPlayer = !rt.isOpen;
        rt.collider.blocksLight = !rt.isOpen;
      }
    });
    this.pickupMeshes.forEach((m) => (m.visible = true));
    this.docMeshes.forEach((m) => (m.visible = true));
    this.altarRelicMeshes.forEach((m) => (m.visible = false));
    this.roomLightMuted.clear();
    this.lastVisibleRoom = null;
    this.hideRescueBattery();
    this.materials.maiClueOverlay.opacity = 0;
    this.materials.keypad.emissive.setHex(0x220404);
  }

  public updateFlashlightClues(
    dt: number,
    camera: THREE.PerspectiveCamera,
    flashlightOn: boolean,
    hasFlashlight: boolean,
  ): boolean {
    let revealedNow = false;
    let targetOpacity = 0;

    if (hasFlashlight && flashlightOn) {
      const dist = camera.position.distanceTo(this.easelPos);
      if (dist <= GAME_CONFIG.HIDDEN_CLUE_FLASHLIGHT_DISTANCE) {
        camera.getWorldDirection(this.camForward);
        this.toEasel.subVectors(this.easelPos, camera.position).normalize();
        const dot = this.camForward.dot(this.toEasel);
        if (dot > 0.82) {
          targetOpacity = 1;
          revealedNow = true;
        }
      }
    }

    this.materials.maiClueOverlay.opacity = THREE.MathUtils.damp(
      this.materials.maiClueOverlay.opacity,
      targetOpacity,
      8,
      dt,
    );
    return revealedNow;
  }

  public updateKeypadVisual(powerRestored: boolean, unlocked: boolean): void {
    if (!powerRestored) {
      this.materials.keypad.emissive.setHex(0x050505);
    } else if (unlocked) {
      this.materials.keypad.emissive.setHex(0x0a3818);
    } else {
      this.materials.keypad.emissive.setHex(0x3a0808);
    }
  }

  private buildMoonlightExterior(): void {
    const ground = new THREE.Mesh(
      this.regGeo(new THREE.PlaneGeometry(60, 60)),
      this.materials.concrete,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(8, -0.05, 6);
    this.exteriorGroup.add(ground);

    const moonLight = new THREE.DirectionalLight(0x4b628c, 0.35);
    moonLight.position.set(10, 14, -12);
    moonLight.target.position.set(8, 0, 6);
    this.exteriorGroup.add(moonLight);
    this.exteriorGroup.add(moonLight.target);

    const hemi = new THREE.HemisphereLight(0x233047, 0x0b0a0c, 0.28);
    this.exteriorGroup.add(hemi);

    this.root.add(this.exteriorGroup);
  }

  private buildLights(): void {
    const poolSize = GAME_CONFIG.MAX_ACTIVE_POINT_LIGHTS;
    for (let i = 0; i < poolSize; i++) {
      const pl = new THREE.PointLight(0x3a4a63, 0, 8, 2);
      pl.castShadow = false;
      this.root.add(pl);

      const src = LIGHTS[i] ?? LIGHTS[0];
      this.managedLights.push({
        id: src.id,
        roomId: src.roomId,
        x: src.x,
        y: src.y,
        z: src.z,
        baseIntensity: 0,
        flicker: false,
        light: pl,
      });
    }
  }

  private buildDebugVisuals(): void {
    const colMat = new THREE.MeshBasicMaterial({
      color: 0xdc2626,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    for (const c of this.colliders) {
      const w = c.maxX - c.minX;
      const h = c.maxY - c.minY;
      const d = c.maxZ - c.minZ;
      const m = new THREE.Mesh(this.regGeo(new THREE.BoxGeometry(w, h, d)), colMat);
      m.position.set((c.minX + c.maxX) / 2, (c.minY + c.maxY) / 2, (c.minZ + c.maxZ) / 2);
      m.userData.ignoreRaycast = true;
      this.debugCollidersGroup.add(m);
    }
    this.debugCollidersGroup.visible = false;
    this.root.add(this.debugCollidersGroup);

    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const nodeGeo = this.regGeo(new THREE.SphereGeometry(0.14, 8, 8));
    const wpMap = new Map(WAYPOINTS.map((w) => [w.id, w]));

    const linePositions: number[] = [];
    for (const wp of WAYPOINTS) {
      const m = new THREE.Mesh(nodeGeo, nodeMat);
      m.position.set(wp.x, wp.y + 0.25, wp.z);
      m.userData.ignoreRaycast = true;
      this.debugWaypointsGroup.add(m);

      for (const nId of wp.neighbors) {
        const nb = wpMap.get(nId);
        if (nb && wp.id < nb.id) {
          linePositions.push(wp.x, wp.y + 0.25, wp.z, nb.x, nb.y + 0.25, nb.z);
        }
      }
    }

    const lineGeo = this.regGeo(new THREE.BufferGeometry());
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x0284c7 });
    const segs = new THREE.LineSegments(lineGeo, lineMat);
    segs.userData.ignoreRaycast = true;
    this.debugWaypointsGroup.add(segs);
    this.debugWaypointsGroup.visible = false;
    this.root.add(this.debugWaypointsGroup);
  }

  public setDebugVisibility(showColliders: boolean, showWaypoints: boolean): void {
    this.debugCollidersGroup.visible = showColliders;
    this.debugWaypointsGroup.visible = showWaypoints;
  }

  public updateRoomVisibility(currentRoomId: RoomId): void {
    if (this.lastVisibleRoom === currentRoomId) return;
    this.lastVisibleRoom = currentRoomId;

    const current = ROOMS[currentRoomId];
    const visibleSet = new Set<RoomId>(current ? [currentRoomId, ...current.visibleNeighbors] : [currentRoomId]);

    this.roomGroups.forEach((group, roomId) => {
      group.visible = visibleSet.has(roomId);
    });
  }

  public updateDoorsAnimation(dt: number): void {
    this.doors.forEach((rt) => {
      if (Math.abs(rt.pivot.rotation.y - rt.targetAngle) > 0.002) {
        rt.pivot.rotation.y = THREE.MathUtils.damp(rt.pivot.rotation.y, rt.targetAngle, 10, dt);
      }
    });
  }

  public updateLights(
    playerPos: THREE.Vector3,
    dt: number,
    powerRestored = false,
    ghostPos?: THREE.Vector3,
    ghostActive = false,
    reduceFlash = false,
  ): void {
    this.flickerTime += dt;

    const ranked = LIGHTS.map((l) => {
      const dx = l.x - playerPos.x;
      const dy = l.y - (playerPos.y + 1.2);
      const dz = l.z - playerPos.z;
      return { def: l, distSq: dx * dx + dy * dy + dz * dz };
    }).sort((a, b) => a.distSq - b.distSq);

    for (let i = 0; i < this.managedLights.length; i++) {
      const slot = this.managedLights[i];
      const target = ranked[i]?.def;
      if (!target || ranked[i].distSq > 225) {
        slot.light.intensity = 0;
        continue;
      }
      slot.light.position.set(target.x, target.y, target.z);
      slot.light.color.setHex(target.color);
      slot.light.distance = target.distance;
      slot.light.decay = target.decay ?? 2;

      if (this.roomLightMuted.has(target.roomId)) {
        slot.light.intensity = 0.08;
        continue;
      }

      if (target.requiresPower && !powerRestored) {
        slot.light.color.setHex(0x6e1a18);
        slot.light.intensity = target.roomId === 'ritual_room' ? 0.25 : 0.08;
        continue;
      }

      let intensity = target.intensity;
      if (target.flicker) {
        const wave = Math.sin(this.flickerTime * 11.3) * Math.sin(this.flickerTime * 3.7);
        intensity *= wave > 0.6 ? 0.35 : 0.85 + wave * 0.15;
      }

      // Đèn phòng chập chờn khi ma ở gần
      if (ghostActive && ghostPos && !reduceFlash) {
        const gDist = Math.hypot(target.x - ghostPos.x, target.y - (ghostPos.y + 1.2), target.z - ghostPos.z);
        if (gDist < GAME_CONFIG.GHOST_FLICKER_RADIUS) {
          const proximity = 1 - gDist / GAME_CONFIG.GHOST_FLICKER_RADIUS;
          const wave = Math.sin(this.flickerTime * 27) * Math.sin(this.flickerTime * 9.5);
          if (wave > 0.45 - proximity * 0.35) {
            intensity *= Math.max(0.1, 1 - proximity * 0.85);
          }
        }
      }

      slot.light.intensity = intensity;
    }
  }

  public getHidingSpotMeta(propId: string) {
    return PROPS.find((p) => p.id === propId && p.isHidingSpot) ?? null;
  }

  public getAllHidingSpots() {
    return PROPS.filter((p) => p.isHidingSpot);
  }

  public findRoomAt(x: number, y: number, z: number): RoomId {
    for (const ramp of STAIR_RAMPS) {
      if (
        x >= ramp.minX - 0.15 &&
        x <= ramp.maxX + 0.15 &&
        z >= ramp.minZ &&
        z <= ramp.maxZ &&
        y >= Math.min(ramp.startY, ramp.endY) - 0.5 &&
        y <= Math.max(ramp.startY, ramp.endY) + 0.8
      ) {
        return ramp.roomId;
      }
    }

    for (const fz of FLOOR_ZONES) {
      if (
        x >= fz.minX &&
        x <= fz.maxX &&
        z >= fz.minZ &&
        z <= fz.maxZ &&
        Math.abs(y - fz.y) < 1.35
      ) {
        return fz.roomId;
      }
    }

    if (y < -1.5) return 'basement_hallway';
    if (y > 1.8) return 'hallway_2f';
    return 'hallway_1f';
  }

  private buildAtmosphericDust(): void {
    this.dustGeo = new THREE.BoxGeometry(0.014, 0.014, 0.014);
    this.dustMat = new THREE.MeshBasicMaterial({
      color: 0xc9c2b4,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    const inst = new THREE.InstancedMesh(this.dustGeo, this.dustMat, this.dustCount);
    inst.name = 'AtmosphericDust';
    inst.frustumCulled = false;
    inst.userData.ignoreRaycast = true;
    for (let i = 0; i < this.dustCount; i++) {
      this.dustOffsets[i * 3] = (Math.random() - 0.5) * 9.0;
      this.dustOffsets[i * 3 + 1] = Math.random() * 2.4;
      this.dustOffsets[i * 3 + 2] = (Math.random() - 0.5) * 9.0;
    }
    this.dustMesh = inst;
    this.root.add(inst);
  }

  public setAtmosphericDust(enabled: boolean): void {
    this.dustEnabled = enabled;
    if (this.dustMesh) {
      this.dustMesh.visible = enabled;
    }
  }

  public updateDust(dt: number, playerPos: THREE.Vector3): void {
    if (!this.dustMesh || !this.dustEnabled) return;
    this.dustTime += dt;
    for (let i = 0; i < this.dustCount; i++) {
      const idx = i * 3;
      const ox = this.dustOffsets[idx] + Math.sin(this.dustTime * 0.4 + i) * 0.22;
      const oy = ((this.dustOffsets[idx + 1] + this.dustTime * 0.07 + i * 0.13) % 2.4) + 0.15;
      const oz = this.dustOffsets[idx + 2] + Math.cos(this.dustTime * 0.35 + i * 1.7) * 0.22;
      this.dustDummy.position.set(playerPos.x + ox, playerPos.y + oy, playerPos.z + oz);
      this.dustDummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, this.dustDummy.matrix);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    for (const geo of this.geometries) {
      geo.dispose();
    }
    this.geometries = [];
    this.dustGeo?.dispose();
    this.dustMat?.dispose();
    this.dustMesh = null;
    this.invisibleHitMaterial.dispose();
    this.materials.dispose();
    this.root.clear();
  }
}
