import * as THREE from 'three';
import { GAME_CONFIG } from '../config';

// Hệ thống raycast tương tác từ giữa màn hình trong phạm vi 2.0 m (có che chắn bởi tường/đồ vật)

export interface InteractableEntry {
  id: string;
  getPrompt: () => string | null;
  onInteract: () => void;
  maxDistance?: number;
}

export class InteractionSystem {
  private entries = new Map<string, InteractableEntry>();
  private raycaster = new THREE.Raycaster();
  private readonly centerNDC = new THREE.Vector2(0, 0);
  private activeId: string | null = null;
  private activePrompt: string | null = null;

  constructor() {
    this.raycaster.far = GAME_CONFIG.INTERACT_DISTANCE + 0.5;
  }

  public register(entry: InteractableEntry): void {
    this.entries.set(entry.id, entry);
  }

  public unregister(id: string): void {
    this.entries.delete(id);
    if (this.activeId === id) {
      this.activeId = null;
      this.activePrompt = null;
    }
  }

  public clear(): void {
    this.entries.clear();
    this.activeId = null;
    this.activePrompt = null;
  }

  public update(camera: THREE.PerspectiveCamera, sceneRoot: THREE.Object3D): string | null {
    this.raycaster.setFromCamera(this.centerNDC, camera);
    const hits = this.raycaster.intersectObjects(sceneRoot.children, true);

    this.activeId = null;
    this.activePrompt = null;

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      if (!hit.object.visible) continue;
      // Bỏ qua các lớp debug wireframe hoặc mặt phẳng không cản tia nhìn (vòng nghi lễ)
      if (hit.object.userData?.ignoreRaycast) continue;

      if (hit.distance > GAME_CONFIG.INTERACT_DISTANCE) {
        break;
      }

      // Tìm interactId ở object hiện tại hoặc các object cha
      let cur: THREE.Object3D | null = hit.object;
      let foundId: string | null = null;
      while (cur) {
        if (typeof cur.userData?.interactId === 'string') {
          foundId = cur.userData.interactId;
          break;
        }
        cur = cur.parent;
      }

      if (foundId) {
        const entry = this.entries.get(foundId);
        if (entry) {
          const maxDist = entry.maxDistance ?? GAME_CONFIG.INTERACT_DISTANCE;
          if (hit.distance <= maxDist) {
            const prompt = entry.getPrompt();
            if (prompt) {
              this.activeId = foundId;
              this.activePrompt = prompt;
              return prompt;
            }
          }
        }
      }

      // Nếu tia chạm vào vật cản rắn không có interactId (tường, tủ...), dừng raycast để không xuyên tường
      break;
    }

    return null;
  }

  public getActivePrompt(): string | null {
    return this.activePrompt;
  }

  public triggerActive(): boolean {
    if (!this.activeId) return false;
    const entry = this.entries.get(this.activeId);
    if (!entry) return false;
    entry.onInteract();
    return true;
  }
}
