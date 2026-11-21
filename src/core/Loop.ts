import * as THREE from 'three';
import { GAME_CONFIG } from '../config';

// Vòng lặp cố định 60 Hz cho logic và render theo requestAnimationFrame (hỗ trợ pacing cho Software WebGL)

export class GameLoop {
  private running = false;
  private frameId = 0;
  private lastTimeMs = 0;
  private accumulator = 0;
  private fpsFrames = 0;
  private fpsElapsed = 0;
  public currentFps = 60;

  private readonly fixedUpdate: (dt: number) => void;
  private readonly renderFrame: () => void;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly isSoftwareGl: boolean;

  constructor(
    renderer: THREE.WebGLRenderer,
    isSoftwareGl: boolean,
    fixedUpdate: (dt: number) => void,
    renderFrame: () => void,
  ) {
    this.renderer = renderer;
    this.isSoftwareGl = isSoftwareGl;
    this.fixedUpdate = fixedUpdate;
    this.renderFrame = renderFrame;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimeMs = performance.now();
    this.accumulator = 0;
    this.scheduleNext();
  }

  public stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
  }

  private scheduleNext(): void {
    if (!this.running) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        this.tick();
      });
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private tick = (): void => {
    if (!this.running) return;

    const now = performance.now();
    let delta = (now - this.lastTimeMs) / 1000;
    this.lastTimeMs = now;

    // Giới hạn delta tối đa 0.1 giây theo đặc tả
    if (delta > GAME_CONFIG.MAX_DELTA) {
      delta = GAME_CONFIG.MAX_DELTA;
    }
    if (delta < 0) delta = 0;

    this.accumulator += delta;
    const step = GAME_CONFIG.FIXED_TIMESTEP;
    let steps = 0;
    while (this.accumulator >= step && steps < 6) {
      this.fixedUpdate(step);
      this.accumulator -= step;
      steps++;
    }

    // Đo FPS thực tế
    this.fpsFrames++;
    this.fpsElapsed += delta;
    if (this.fpsElapsed >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsElapsed);
      this.fpsFrames = 0;
      this.fpsElapsed = 0;
    }

    this.renderFrame();
    this.scheduleNext();
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!this.running) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }
}
