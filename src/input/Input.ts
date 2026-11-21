import { DEFAULT_KEY_BINDINGS } from '../config';
import { KeyAction, KeyBindings } from '../types';

// Quản lý đầu vào bàn phím (hỗ trợ đổi phím) và chuột (Pointer Lock) kết hợp với cảm ứng

export interface InputActionCallbacks {
  onToggleFlashlight?: () => void;
  onToggleCrouch?: () => void;
  onInteract?: () => void;
  onToggleInventory?: () => void;
  onToggleJournal?: () => void;
  onPause?: () => void;
  onPointerLockChange?: (locked: boolean) => void;
  onFirstGesture?: () => void;
}

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'Space') return 'Space';
  if (code === 'Tab') return 'Tab';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  return code;
}

export class InputManager {
  private keys = new Set<string>();
  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private pointerLocked = false;
  private targetElement: HTMLElement | null = null;
  private callbacks: InputActionCallbacks;
  private sensitivity = 1.0;
  private bindings: KeyBindings = { ...DEFAULT_KEY_BINDINGS };

  public readonly isTouchCapable: boolean;

  constructor(callbacks: InputActionCallbacks) {
    this.callbacks = callbacks;
    this.isTouchCapable =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }

  public setKeyBindings(next: KeyBindings): void {
    this.bindings = { ...DEFAULT_KEY_BINDINGS, ...next };
  }

  public getKeyLabel(action: KeyAction): string {
    return formatKeyCode(this.bindings[action]);
  }

  public attach(element: HTMLElement): void {
    this.targetElement = element;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    window.addEventListener('blur', this.handleWindowBlur);
  }

  public detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    this.targetElement = null;
    this.keys.clear();
  }

  public setSensitivity(val: number): void {
    this.sensitivity = val;
  }

  public requestPointerLock(): void {
    this.callbacks.onFirstGesture?.();
    if (!this.targetElement || this.pointerLocked) return;
    try {
      const promise = this.targetElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {
          // Một số trình duyệt từ chối nếu chưa đủ cử chỉ hợp lệ
        });
      }
    } catch {
      // Bỏ qua trên thiết bị không hỗ trợ Pointer Lock
    }
  }

  public exitPointerLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  public getMoveAxes(): { forward: number; right: number } {
    let forward = 0;
    let right = 0;
    if (this.keys.has(this.bindings.moveForward) || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has(this.bindings.moveBackward) || this.keys.has('ArrowDown')) forward -= 1;
    if (this.keys.has(this.bindings.moveRight) || this.keys.has('ArrowRight')) right += 1;
    if (this.keys.has(this.bindings.moveLeft) || this.keys.has('ArrowLeft')) right -= 1;
    return { forward, right };
  }

  public isSprinting(): boolean {
    return (
      this.keys.has(this.bindings.sprint) ||
      (this.bindings.sprint === 'ShiftLeft' && this.keys.has('ShiftRight'))
    );
  }

  public isHoldingCrouchKey(): boolean {
    return this.keys.has('ControlLeft') || this.keys.has('ControlRight');
  }

  public isHoldingBreathKey(): boolean {
    return this.keys.has(this.bindings.holdBreath);
  }

  public consumeLookDelta(): { dx: number; dy: number } {
    const dx = this.lookDeltaX * 0.0022 * this.sensitivity;
    const dy = this.lookDeltaY * 0.0022 * this.sensitivity;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return { dx, dy };
  }

  public clearKeys(): void {
    this.keys.clear();
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.callbacks.onFirstGesture?.();
    if (e.code === 'Tab' || e.code === this.bindings.inventory) {
      if (e.code === 'Tab') e.preventDefault();
    }
    if (!e.repeat) {
      if (e.code === this.bindings.flashlight) this.callbacks.onToggleFlashlight?.();
      else if (e.code === this.bindings.crouch) this.callbacks.onToggleCrouch?.();
      else if (e.code === this.bindings.interact) this.callbacks.onInteract?.();
      else if (e.code === 'Tab' || e.code === this.bindings.inventory)
        this.callbacks.onToggleInventory?.();
      else if (e.code === this.bindings.journal) this.callbacks.onToggleJournal?.();
      else if (e.code === 'Escape') this.callbacks.onPause?.();
    }
    this.keys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.pointerLocked) return;
    // Chặn giá trị nhảy vọt bất thường khi vừa khóa chuột
    const mx = Math.max(-120, Math.min(120, e.movementX));
    const my = Math.max(-120, Math.min(120, e.movementY));
    this.lookDeltaX += mx;
    this.lookDeltaY += my;
  };

  private handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.targetElement;
    this.callbacks.onPointerLockChange?.(this.pointerLocked);
  };

  private handleWindowBlur = (): void => {
    this.keys.clear();
  };
}
