import * as THREE from 'three';
import { PropDef } from '../types';
import { MaterialLibrary } from './Materials';

// Tạo các món đồ nội thất ghép từ nhiều hình khối cơ bản, tâm đáy đặt tại (0, 0, 0)

export function createPropMesh(
  prop: PropDef,
  mats: MaterialLibrary,
  geometriesToDispose: THREE.BufferGeometry[],
): THREE.Group {
  const group = new THREE.Group();
  group.name = prop.id;

  const reg = <T extends THREE.BufferGeometry>(g: T): T => {
    geometriesToDispose.push(g);
    return g;
  };

  const addBox = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    castShadow = true,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(reg(new THREE.BoxGeometry(w, h, d)), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const { width: W, height: H, depth: D } = prop;

  switch (prop.kind) {
    case 'bed': {
      // 4 chân giường để tạo khoảng hở dưới gầm cho di vật
      const legH = 0.25;
      const legOffsets: [number, number][] = [
        [-W * 0.44, -D * 0.44],
        [W * 0.44, -D * 0.44],
        [-W * 0.44, D * 0.44],
        [W * 0.44, D * 0.44],
      ];
      for (const [lx, lz] of legOffsets) {
        addBox(0.1, legH, 0.1, mats.furnitureWood, lx, legH / 2, lz);
      }
      // Khung giường
      addBox(W, 0.12, D, mats.furnitureWood, 0, legH + 0.06, 0);
      // Đầu giường
      addBox(W, 0.72, 0.1, mats.furnitureWood, 0, legH + 0.36, -D / 2 + 0.05);
      // Nệm & chăn
      addBox(W * 0.92, 0.18, D * 0.88, mats.bedding, 0, legH + 0.2, 0.04);
      // Gối
      addBox(W * 0.52, 0.1, 0.34, mats.bedding, 0, legH + 0.33, -D / 2 + 0.34);
      break;
    }

    case 'nightstand': {
      addBox(W, H * 0.88, D, mats.furnitureWood, 0, H * 0.44, 0);
      // Mặt bàn nhô nhẹ
      addBox(W * 1.06, 0.05, D * 1.06, mats.furnitureWood, 0, H - 0.025, 0);
      // Mặt ngăn kéo và tay nắm kim loại
      addBox(W * 0.82, H * 0.28, 0.03, mats.doorWood, 0, H * 0.65, D / 2 + 0.015);
      addBox(0.12, 0.03, 0.04, mats.metalDark, 0, H * 0.65, D / 2 + 0.04);
      addBox(W * 0.82, H * 0.28, 0.03, mats.doorWood, 0, H * 0.3, D / 2 + 0.015);
      addBox(0.12, 0.03, 0.04, mats.metalDark, 0, H * 0.3, D / 2 + 0.04);
      break;
    }

    case 'wardrobe':
    case 'tall_cabinet':
    case 'wooden_cabinet': {
      const matBody = prop.kind === 'wooden_cabinet' ? mats.furnitureWood : mats.doorWood;
      // Thân tủ
      addBox(W, H, D, matBody, 0, H / 2, 0);
      // Viền nóc
      addBox(W + 0.06, 0.07, D + 0.06, mats.furnitureWood, 0, H - 0.035, 0);
      // Hai cánh cửa tủ (hơi hé tạo cảm giác có thể trốn)
      addBox(0.03, H * 0.88, D * 0.44, mats.furnitureWood, W / 2 + 0.02, H * 0.48, -D * 0.24);
      const ajarDoor = addBox(0.03, H * 0.88, D * 0.44, mats.furnitureWood, W / 2 + 0.05, H * 0.48, D * 0.24);
      ajarDoor.rotation.y = 0.14;
      // Tay nắm
      addBox(0.04, 0.14, 0.03, mats.metalDark, W / 2 + 0.05, H * 0.5, -0.06);
      addBox(0.04, 0.14, 0.03, mats.metalDark, W / 2 + 0.07, H * 0.5, 0.06);
      break;
    }

    case 'metal_locker': {
      addBox(W, H, D, mats.metalRust, 0, H / 2, 0);
      // Khe thông gió & tay nắm
      addBox(W * 0.78, H * 0.9, 0.03, mats.metalDark, 0, H * 0.5, D / 2 + 0.015);
      for (let i = 0; i < 3; i++) {
        addBox(W * 0.46, 0.02, 0.04, mats.concrete, 0, H * 0.78 - i * 0.06, D / 2 + 0.02);
      }
      addBox(0.04, 0.16, 0.04, mats.metalDark, W * 0.28, H * 0.5, D / 2 + 0.035);
      break;
    }

    case 'boarded_window': {
      // Kính mờ ánh trăng + 3 thanh gỗ đóng đinh chéo
      addBox(W, H, 0.04, mats.moonGlass, 0, H / 2, 0, false);
      for (let i = 0; i < 3; i++) {
        const plank = addBox(W * 1.08, 0.14, 0.04, mats.furnitureWood, 0, 0.25 + i * 0.36, 0.04);
        plank.rotation.z = (i - 1) * 0.08;
      }
      break;
    }

    case 'talisman': {
      const plane = new THREE.Mesh(reg(new THREE.PlaneGeometry(W, H)), mats.talisman);
      plane.position.set(0, 0, 0);
      group.add(plane);
      break;
    }

    case 'sofa': {
      // Đế sofa
      addBox(W, 0.24, D, mats.fabricSofa, 0, 0.16, 0);
      // Tựa lưng
      addBox(W, 0.58, 0.2, mats.fabricSofa, 0, 0.54, -D / 2 + 0.1);
      // Tay vịn hai bên
      addBox(0.2, 0.46, D, mats.fabricSofa, -W / 2 + 0.1, 0.35, 0);
      addBox(0.2, 0.46, D, mats.fabricSofa, W / 2 - 0.1, 0.35, 0);
      // 3 đệm ngồi
      for (let i = -1; i <= 1; i++) {
        addBox(W * 0.27, 0.12, D * 0.7, mats.fabricSofa, i * (W * 0.28), 0.33, 0.06);
      }
      break;
    }

    case 'coffee_table':
    case 'dining_table':
    case 'desk': {
      const topThick = 0.06;
      addBox(W, topThick, D, mats.furnitureWood, 0, H - topThick / 2, 0);
      const lx = W / 2 - 0.08;
      const lz = D / 2 - 0.08;
      const legH = H - topThick;
      addBox(0.08, legH, 0.08, mats.furnitureWood, -lx, legH / 2, -lz);
      addBox(0.08, legH, 0.08, mats.furnitureWood, lx, legH / 2, -lz);
      addBox(0.08, legH, 0.08, mats.furnitureWood, -lx, legH / 2, lz);
      addBox(0.08, legH, 0.08, mats.furnitureWood, lx, legH / 2, lz);
      if (prop.kind === 'desk') {
        // Hộc ngăn kéo có ổ khóa mã bên phải bàn làm việc
        addBox(0.48, legH * 0.72, D * 0.85, mats.doorWood, W * 0.28, legH * 0.55, 0);
        addBox(0.38, 0.14, 0.03, mats.metalDark, W * 0.28, legH * 0.72, D * 0.43);
      }
      break;
    }

    case 'tv_stand': {
      addBox(W, H, D, mats.furnitureWood, 0, H / 2, 0);
      // 2 ngăn kéo
      addBox(W * 0.42, H * 0.45, 0.03, mats.doorWood, -W * 0.24, H * 0.52, D / 2 + 0.015);
      addBox(W * 0.42, H * 0.45, 0.03, mats.doorWood, W * 0.24, H * 0.52, D / 2 + 0.015);
      // TV cũ phủ bụi trên kệ
      addBox(0.95, 0.56, 0.08, mats.metalDark, 0, H + 0.34, 0);
      addBox(0.22, 0.08, 0.18, mats.metalDark, 0, H + 0.04, 0);
      break;
    }

    case 'fireplace': {
      // Thân gạch lò sưởi
      addBox(W, H, D, mats.brickDark, 0, H / 2, 0);
      // Bệ lò sưởi phía trên
      addBox(W + 0.14, 0.1, D + 0.12, mats.furnitureWood, 0, H + 0.05, 0);
      // Hốc tro tối (khung ảnh gia đình được tạo thành vật phẩm nhặt riêng trên bệ)
      addBox(W * 0.55, H * 0.55, 0.12, mats.emberGlow, 0, H * 0.28, -D / 2 + 0.08, false);
      break;
    }

    case 'wall_clock': {
      const frame = new THREE.Mesh(
        reg(new THREE.CylinderGeometry(W / 2, W / 2, D, 20)),
        mats.furnitureWood,
      );
      frame.rotation.x = Math.PI / 2;
      group.add(frame);

      const face = new THREE.Mesh(reg(new THREE.CircleGeometry(W * 0.44, 20)), mats.clockFace);
      face.position.z = D / 2 + 0.005;
      group.add(face);
      break;
    }

    case 'keypad': {
      addBox(W, H, D, mats.metalDark, 0, 0, 0, false);
      const face = new THREE.Mesh(reg(new THREE.PlaneGeometry(W * 0.88, H * 0.88)), mats.keypad);
      face.position.z = D / 2 + 0.004;
      group.add(face);
      break;
    }

    case 'shelf': {
      const cols = [-W / 2 + 0.04, W / 2 - 0.04];
      for (const cx of cols) {
        addBox(0.06, H, D, mats.furnitureWood, cx, H / 2, 0);
      }
      for (let i = 0; i < 4; i++) {
        addBox(W, 0.05, D, mats.furnitureWood, 0, 0.12 + i * ((H - 0.2) / 3), 0);
      }
      break;
    }

    case 'crate': {
      addBox(W, H, D, mats.furnitureWood, 0, H / 2, 0);
      addBox(W + 0.04, 0.08, D + 0.04, mats.doorWood, 0, H - 0.04, 0);
      addBox(W + 0.04, 0.08, D + 0.04, mats.doorWood, 0, 0.04, 0);
      break;
    }

    case 'kitchen_counter':
    case 'under_counter_cabinet': {
      addBox(W, H - 0.06, D, mats.doorWood, 0, (H - 0.06) / 2, 0);
      // Mặt đá bếp
      addBox(W + 0.04, 0.06, D + 0.04, mats.concrete, 0, H - 0.03, 0);
      // Cánh tủ bếp
      const numDoors = Math.max(2, Math.round(W / 0.6));
      const dw = (W * 0.9) / numDoors;
      for (let i = 0; i < numDoors; i++) {
        const dx = -W * 0.45 + dw * (i + 0.5);
        addBox(dw - 0.04, H * 0.72, 0.03, mats.furnitureWood, dx, H * 0.42, -D / 2 - 0.015);
      }
      break;
    }

    case 'fridge': {
      addBox(W, H, D, mats.metalDark, 0, H / 2, 0);
      addBox(W * 0.94, H * 0.3, 0.04, mats.concrete, 0, H * 0.82, D / 2 + 0.02);
      addBox(W * 0.94, H * 0.62, 0.04, mats.concrete, 0, H * 0.33, D / 2 + 0.02);
      addBox(0.04, 0.25, 0.05, mats.metalRust, W * 0.36, H * 0.78, D / 2 + 0.05);
      addBox(0.04, 0.35, 0.05, mats.metalRust, W * 0.36, H * 0.42, D / 2 + 0.05);
      break;
    }

    case 'chair': {
      addBox(W, 0.06, D, mats.furnitureWood, 0, 0.45, 0);
      addBox(W, 0.5, 0.06, mats.furnitureWood, 0, 0.72, D / 2 - 0.03);
      const ox = W / 2 - 0.04;
      const oz = D / 2 - 0.04;
      addBox(0.05, 0.45, 0.05, mats.furnitureWood, -ox, 0.225, -oz);
      addBox(0.05, 0.45, 0.05, mats.furnitureWood, ox, 0.225, -oz);
      addBox(0.05, 0.45, 0.05, mats.furnitureWood, -ox, 0.225, oz);
      addBox(0.05, 0.45, 0.05, mats.furnitureWood, ox, 0.225, oz);
      break;
    }

    case 'toolbox': {
      addBox(W, H * 0.82, D, mats.metalRust, 0, H * 0.41, 0);
      addBox(W * 1.02, 0.08, D * 1.02, mats.metalDark, 0, H * 0.85, 0);
      addBox(0.24, 0.06, 0.05, mats.metalDark, 0, H * 0.96, 0);
      break;
    }

    case 'easel_painting': {
      // Chân giá vẽ chữ A
      const legL = addBox(0.06, H, 0.06, mats.furnitureWood, -0.28, H * 0.48, 0.05);
      legL.rotation.z = -0.14;
      legL.rotation.x = 0.1;
      const legR = addBox(0.06, H, 0.06, mats.furnitureWood, 0.28, H * 0.48, 0.05);
      legR.rotation.z = 0.14;
      legR.rotation.x = 0.1;
      const legB = addBox(0.06, H, 0.06, mats.furnitureWood, 0, H * 0.46, 0.26);
      legB.rotation.x = -0.25;
      // Bức tranh bé Mai
      const frame = addBox(0.7, 0.7, 0.05, mats.furnitureWood, 0, 1.05, -0.06);
      frame.rotation.x = 0.1;
      const canvas = new THREE.Mesh(reg(new THREE.PlaneGeometry(0.62, 0.62)), mats.maiPainting);
      canvas.position.set(0, 1.05, -0.09);
      canvas.rotation.y = Math.PI;
      canvas.rotation.x = -0.1;
      group.add(canvas);

      // Lớp chữ ẩn "21" chỉ hiện khi soi đèn pin gần (< 2 m)
      const clueLayer = new THREE.Mesh(reg(new THREE.PlaneGeometry(0.62, 0.62)), mats.maiClueOverlay);
      clueLayer.position.set(0, 1.05, -0.096);
      clueLayer.rotation.y = Math.PI;
      clueLayer.rotation.x = -0.1;
      group.add(clueLayer);
      break;
    }

    case 'breaker_box': {
      addBox(W, H, D, mats.metalDark, 0, 0, 0);
      addBox(W * 0.86, H * 0.88, 0.03, mats.metalRust, 0, 0, D / 2 + 0.015);
      // Cần gạt đỏ bên hông
      addBox(0.06, 0.2, 0.12, mats.emberGlow, W / 2 + 0.04, 0.05, 0);
      break;
    }

    case 'altar': {
      // Bàn thờ nghi lễ + khăn phủ + nến tắt + vòng nghi lễ dưới nền
      addBox(W, H * 0.85, D, mats.furnitureWood, 0, H * 0.425, 0);
      addBox(W + 0.06, 0.08, D + 0.06, mats.fabricSofa, 0, H - 0.04, 0);
      // 2 cây nến
      for (const cx of [-W * 0.36, W * 0.36]) {
        const candle = new THREE.Mesh(
          reg(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 10)),
          mats.candleWax,
        );
        candle.position.set(cx, H + 0.11, 0);
        group.add(candle);
      }
      // Vòng nghi lễ vẽ dưới sàn trước bàn thờ (búp bê & chìa khóa tạo ở dạng vật phẩm nhặt)
      const circle = new THREE.Mesh(reg(new THREE.PlaneGeometry(2.8, 2.8)), mats.ritualCircle);
      circle.rotation.x = -Math.PI / 2;
      circle.position.set(0, 0.02, -1.6);
      group.add(circle);
      break;
    }

    case 'railing': {
      addBox(W, 0.06, D, mats.furnitureWood, 0, H, 0);
      for (let i = -2; i <= 2; i++) {
        addBox(0.06, H, 0.06, mats.furnitureWood, (i * W) / 5, H / 2, 0);
      }
      break;
    }

    default: {
      addBox(W, H, D, mats.furnitureWood, 0, H / 2, 0);
      break;
    }
  }

  group.position.set(prop.x, prop.y, prop.z);
  if (prop.rotationY) {
    group.rotation.y = prop.rotationY;
  }

  return group;
}
