import { GAME_CONFIG } from '../config';
import { AABB, FloorSurface } from '../types';
import { FLOOR_ZONES, STAIR_RAMPS } from '../world/layoutData';

// Hệ thống va chạm tự viết: hình tròn bán kính 0.3m trên mặt phẳng XZ vs AABB có chiều cao Y

export interface ResolvedPosition {
  x: number;
  y: number;
  z: number;
  surface: FloorSurface;
  collided: boolean;
}

export class CollisionSystem {
  private colliders: AABB[];

  constructor(colliders: AABB[]) {
    this.colliders = colliders;
  }

  public resolveMove(
    targetX: number,
    currentY: number,
    targetZ: number,
    radius: number,
    playerHeight: number,
  ): ResolvedPosition {
    let x = targetX;
    let z = targetZ;
    let collided = false;

    const nextY = this.resolveGroundY(x, currentY, z);
    const minPlayerY = nextY + 0.15; // chừa bậc thềm nhỏ để leo cầu thang mượt
    const maxPlayerY = nextY + playerHeight;

    // Lặp 3 lần để trượt mượt dọc các góc tường giao nhau
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < this.colliders.length; i++) {
        const box = this.colliders[i];
        if (box.blocksPlayer === false) continue;
        // Chỉ xét collider có giao với khoảng chiều cao người chơi
        if (box.maxY <= minPlayerY || box.minY >= maxPlayerY) continue;

        const closestX = Math.max(box.minX, Math.min(x, box.maxX));
        const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));

        const dx = x - closestX;
        const dz = z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
          collided = true;
          if (distSq > 1e-8) {
            const dist = Math.sqrt(distSq);
            const push = radius - dist;
            x += (dx / dist) * push;
            z += (dz / dist) * push;
          } else {
            // Tâm hình tròn nằm lọt bên trong AABB: đẩy ra cạnh gần nhất
            const penLeft = Math.abs(x - box.minX);
            const penRight = Math.abs(box.maxX - x);
            const penTop = Math.abs(z - box.minZ);
            const penBottom = Math.abs(box.maxZ - z);
            const minPen = Math.min(penLeft, penRight, penTop, penBottom);

            if (minPen === penLeft) x = box.minX - radius;
            else if (minPen === penRight) x = box.maxX + radius;
            else if (minPen === penTop) z = box.minZ - radius;
            else z = box.maxZ + radius;
          }
        }
      }
    }

    // Giới hạn cứng không để rơi ra ngoài biên căn nhà (trừ lối thoát cửa chính)
    const atMainExit = z >= 2.9 && z <= 4.1 && Math.abs(nextY) < 0.5;
    x = Math.max(0.25, Math.min(atMainExit ? 17.5 : 15.75, x));
    z = Math.max(0.25, Math.min(11.75, z));

    const finalY = this.resolveGroundY(x, nextY, z);
    const surface = this.getSurfaceAt(x, finalY, z);

    return { x, y: finalY, z, surface, collided };
  }

  public resolveGroundY(x: number, currentY: number, z: number): number {
    // 1. Kiểm tra đang trên cầu thang
    for (const ramp of STAIR_RAMPS) {
      if (x >= ramp.minX && x <= ramp.maxX && z >= ramp.minZ && z <= ramp.maxZ) {
        const tRaw = (z - ramp.startZ) / (ramp.endZ - ramp.startZ);
        const t = Math.max(0, Math.min(1, tRaw));
        const rampY = ramp.startY + (ramp.endY - ramp.startY) * t;
        if (Math.abs(rampY - currentY) <= 1.25) {
          return rampY;
        }
      }
    }

    // 2. Kiểm tra vùng sàn khớp nhất với độ cao hiện tại
    let bestY = currentY;
    let bestDiff = Infinity;
    for (const fz of FLOOR_ZONES) {
      if (x >= fz.minX && x <= fz.maxX && z >= fz.minZ && z <= fz.maxZ) {
        const diff = Math.abs(fz.y - currentY);
        if (diff < 1.35 && diff < bestDiff) {
          bestDiff = diff;
          bestY = fz.y;
        }
      }
    }

    return bestY;
  }

  public getSurfaceAt(x: number, y: number, z: number): FloorSurface {
    for (const ramp of STAIR_RAMPS) {
      if (x >= ramp.minX && x <= ramp.maxX && z >= ramp.minZ && z <= ramp.maxZ) {
        if (y >= Math.min(ramp.startY, ramp.endY) - 0.5 && y <= Math.max(ramp.startY, ramp.endY) + 0.5) {
          return ramp.surface;
        }
      }
    }
    for (const fz of FLOOR_ZONES) {
      if (x >= fz.minX && x <= fz.maxX && z >= fz.minZ && z <= fz.maxZ && Math.abs(fz.y - y) < 0.8) {
        return fz.surface;
      }
    }
    return FloorSurface.Wood;
  }

  public isPositionValid(x: number, y: number, z: number, radius = GAME_CONFIG.PLAYER_RADIUS): boolean {
    const minY = y + 0.15;
    const maxY = y + GAME_CONFIG.PLAYER_STAND_HEIGHT;
    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      if (box.blocksPlayer === false) continue;
      if (box.maxY <= minY || box.minY >= maxY) continue;
      const cx = Math.max(box.minX, Math.min(x, box.maxX));
      const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < (radius - 0.02) * (radius - 0.02)) {
        return false;
      }
    }
    return true;
  }

  public findNearestSafeSpot(x: number, y: number, z: number): { x: number; y: number; z: number } {
    // Quét vòng tròn đồng tâm để tìm vị trí hợp lệ gần nhất nếu bị kẹt > 3 giây
    for (let dist = 0.4; dist <= 2.5; dist += 0.35) {
      for (let a = 0; a < 8; a++) {
        const angle = (a * Math.PI) / 4;
        const tx = x + Math.cos(angle) * dist;
        const tz = z + Math.sin(angle) * dist;
        const ty = this.resolveGroundY(tx, y, tz);
        if (this.isPositionValid(tx, ty, tz)) {
          return { x: tx, y: ty, z: tz };
        }
      }
    }
    return { ...GAME_CONFIG.PLAYER_START_POS };
  }

  public hasLineOfSight(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;

    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      if (box.blocksLight === false) continue;

      let tMin = 0;
      let tMax = 1;

      const checkAxis = (p: number, d: number, bMin: number, bMax: number): boolean => {
        if (Math.abs(d) < 1e-8) {
          return p >= bMin && p <= bMax;
        }
        let t1 = (bMin - p) / d;
        let t2 = (bMax - p) / d;
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        tMin = Math.max(tMin, t1);
        tMax = Math.min(tMax, t2);
        return tMin <= tMax;
      };

      if (
        checkAxis(x1, dx, box.minX, box.maxX) &&
        checkAxis(y1, dy, box.minY, box.maxY) &&
        checkAxis(z1, dz, box.minZ, box.maxZ)
      ) {
        if (tMin > 0.01 && tMin < 0.99) {
          return false;
        }
      }
    }

    return true;
  }
}
