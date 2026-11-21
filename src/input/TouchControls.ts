// Quản lý điều khiển cảm ứng: joystick trái (đẩy hết cỡ tự chạy) và vuốt xoay camera bên phải

export class TouchControls {
  public moveForward = 0;
  public moveRight = 0;
  public autoSprint = false;
  public holdBreath = false;

  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private sensitivity = 1.0;

  public setSensitivity(val: number): void {
    this.sensitivity = val;
  }

  public setJoystickVector(nx: number, ny: number): void {
    // nx: -1 (trái) -> +1 (phải), ny: -1 (lên/tiến) -> +1 (xuống/lùi)
    this.moveRight = Math.max(-1, Math.min(1, nx));
    this.moveForward = Math.max(-1, Math.min(1, -ny));
    const mag = Math.hypot(nx, ny);
    this.autoSprint = mag >= 0.86 && this.moveForward > 0.35;
  }

  public addLookDelta(dxPixels: number, dyPixels: number): void {
    this.lookDeltaX += dxPixels;
    this.lookDeltaY += dyPixels;
  }

  public consumeLookDelta(): { dx: number; dy: number } {
    const dx = this.lookDeltaX * 0.0045 * this.sensitivity;
    const dy = this.lookDeltaY * 0.0045 * this.sensitivity;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return { dx, dy };
  }

  public reset(): void {
    this.moveForward = 0;
    this.moveRight = 0;
    this.autoSprint = false;
    this.holdBreath = false;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
  }
}
