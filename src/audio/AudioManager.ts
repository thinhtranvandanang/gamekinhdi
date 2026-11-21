import { FloorSurface, GameSettings } from '../types';

// Quản lý âm thanh procedural bằng Web Audio API (3 kênh: Tổng, Nhạc, Hiệu ứng)

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneSubOsc: OscillatorNode | null = null;
  private droneHarmOsc: OscillatorNode | null = null;
  private droneHarmGain: GainNode | null = null;
  private droneLfo: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;
  private heartbeatTimer = 0;
  private ghostStepSubTimer = 0;
  private muted = false;
  private settings: GameSettings;
  private onSubtitle?: (text: string) => void;

  constructor(settings: GameSettings, onSubtitle?: (text: string) => void) {
    this.settings = { ...settings };
    this.onSubtitle = onSubtitle;
  }

  public initOnGesture(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.noiseBuffer = this.createNoiseBuffer(this.ctx, 2.0);
    this.applyVolumes();
    this.startAmbientDrone();
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = { ...settings };
    this.applyVolumes();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolumes();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const master = this.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.04);
  }

  private createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private startAmbientDrone(): void {
    if (!this.ctx || !this.musicGain) return;
    // Âm nền động 3 lớp tần số thấp biến thiên theo Tension
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const harm = this.ctx.createOscillator();
    const harmGain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const droneGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 46;
    sub.type = 'sine';
    sub.frequency.value = 34.5;
    harm.type = 'triangle';
    harm.frequency.value = 69.5;
    harmGain.gain.value = 0.0;

    lfo.type = 'sine';
    lfo.frequency.value = 0.18;
    lfoGain.gain.value = 18;

    filter.type = 'lowpass';
    filter.frequency.value = 115;

    droneGain.gain.value = 0.08;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    osc.connect(filter);
    sub.connect(filter);
    harm.connect(harmGain);
    harmGain.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(this.musicGain);

    osc.start();
    sub.start();
    harm.start();
    lfo.start();
    this.droneOsc = osc;
    this.droneSubOsc = sub;
    this.droneHarmOsc = harm;
    this.droneHarmGain = harmGain;
    this.droneLfo = lfo;
    this.droneFilter = filter;
    this.droneGain = droneGain;
  }

  public setDroneTension(tension01: number): void {
    if (!this.ctx || !this.droneFilter || !this.droneGain) return;
    const t = Math.max(0, Math.min(1, tension01));
    const now = this.ctx.currentTime;
    this.droneFilter.frequency.setTargetAtTime(110 + t * 185, now, 0.25);
    this.droneGain.gain.setTargetAtTime(0.075 + t * 0.085, now, 0.25);
    if (this.droneHarmOsc && this.droneHarmGain) {
      this.droneHarmOsc.frequency.setTargetAtTime(69.5 + t * 24, now, 0.35);
      this.droneHarmGain.gain.setTargetAtTime(t * 0.35, now, 0.3);
    }
    if (this.droneLfo) {
      this.droneLfo.frequency.setTargetAtTime(0.18 + t * 0.85, now, 0.3);
    }
  }

  public playFootstep(surface: FloorSurface, isSprinting: boolean, isCrouching: boolean): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;

    const now = this.ctx.currentTime;
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    const volume = isCrouching ? 0.08 : isSprinting ? 0.26 : 0.16;

    if (surface === FloorSurface.Wood) {
      // Tiếng gỗ trầm + chút cọt kẹt nhẹ
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110 + Math.random() * 25, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);

      filter.type = 'lowpass';
      filter.frequency.value = 380;

      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (surface === FloorSurface.Tile) {
      // Tiếng gạch giòn hơn
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      filter.type = 'bandpass';
      filter.frequency.value = 950 + Math.random() * 200;
      filter.Q.value = 2.4;

      gainNode.gain.setValueAtTime(volume * 0.9, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      src.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.sfxGain);
      src.start(now, Math.random() * 0.4, 0.08);
    } else {
      // Bê tông tầng hầm đục và vang nhẹ
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      filter.type = 'lowpass';
      filter.frequency.value = 520 + Math.random() * 120;

      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      src.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.sfxGain);
      src.start(now, Math.random() * 0.4, 0.12);
    }
  }

  public playFlashlightClick(on: boolean): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(on ? 1400 : 980, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playWarningTone(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.25);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
    if (this.settings.showSubtitles) {
      this.onSubtitle?.('[Tiếng rít lạ vang lên trong bóng tối]');
    }
  }

  public playDoorCreak(open: boolean): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(open ? 115 : 155, now);
    osc.frequency.exponentialRampToValueAtTime(open ? 175 : 85, now + 0.32);

    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 4.5;

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);

    if (this.settings.showSubtitles) {
      this.onSubtitle?.(open ? '[Tiếng cửa gỗ cọt kẹt mở ra]' : '[Tiếng cửa đóng lại]');
    }
  }

  public playDoorLocked(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(65, t + 0.06);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.075);
    }
    if (this.settings.showSubtitles) {
      this.onSubtitle?.('[Tiếng nắm cửa kẹt cứng]');
    }
  }

  public playDrawerSlide(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now, 0, 0.24);
  }

  public playPickup(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.09);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playPaperRustle(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now, 0.1, 0.2);
  }

  public playKeypadBeep(result?: 'ok' | 'err'): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = result === 'err' ? 'sawtooth' : 'sine';
    if (result === 'ok') {
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(990, now + 0.09);
    } else if (result === 'err') {
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.28);
    } else {
      osc.frequency.setValueAtTime(820, now);
    }
    const dur = result === 'err' ? 0.3 : result === 'ok' ? 0.22 : 0.06;
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  public playBreakerSwitch(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.22);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);

    if (this.settings.showSubtitles) {
      this.onSubtitle?.('[Cầu dao đóng mạch, tiếng điện ù lên]');
    }
  }

  private createPanner(x: number, y: number, z: number): PannerNode | null {
    if (!this.ctx || !this.sfxGain) return null;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.6;
    panner.maxDistance = 24;
    panner.rolloffFactor = 1.25;
    if (panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      panner.setPosition(x, y, z);
    }
    panner.connect(this.sfxGain);
    return panner;
  }

  public playWindGust(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.linearRampToValueAtTime(420, now + 0.9);
    filter.frequency.linearRampToValueAtTime(190, now + 2.1);
    filter.Q.value = 3.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 2.25);

    if (this.settings.showSubtitles) {
      this.onSubtitle?.('[Tiếng gió rít khe khẽ qua khung cửa]');
    }
  }

  public playHouseCreak3D(x: number, y: number, z: number): void {
    if (!this.ctx) return;
    const panner = this.createPanner(x, y, z);
    if (!panner) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const base = 95 + Math.random() * 55;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 0.65, now + 0.42);

    filter.type = 'bandpass';
    filter.frequency.value = 480;
    filter.Q.value = 6.0;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.46);

    if (this.settings.showSubtitles) {
      this.onSubtitle?.('[Tiếng gỗ nhà kêu cọt kẹt trong bóng tối]');
    }
  }

  public playWhisper3D(x: number, y: number, z: number, customSub?: string): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const panner = this.createPanner(x, y, z);
    if (!panner) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(900, now);
    f1.frequency.linearRampToValueAtTime(1650, now + 0.35);
    f1.frequency.linearRampToValueAtTime(750, now + 0.9);
    f1.Q.value = 4.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

    src.connect(f1);
    f1.connect(gain);
    gain.connect(panner);
    src.start(now, Math.random() * 0.3, 1.0);

    if (this.settings.showSubtitles) {
      this.onSubtitle?.(customSub ?? '[Tiếng thì thầm khe khẽ vang quanh đây]');
    }
  }

  public playGhostFootstep3D(x: number, y: number, z: number, isChase: boolean): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const panner = this.createPanner(x, y, z);
    if (!panner) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isChase ? 95 : 72, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.14);

    gain.gain.setValueAtTime(isChase ? 0.32 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playCabinetRattle3D(x: number, y: number, z: number): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const panner = this.createPanner(x, y, z);
    if (!panner) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.14;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 320;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      src.start(t, 0.2, 0.11);
    }

    if (this.settings.showSubtitles) {
      this.onSubtitle?.('[Có thứ gì đó đang khẽ lay cửa tủ ngay bên ngoài...]');
    }
  }

  public playGasp(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.22);
    filter.Q.value = 2.0;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now, 0, 0.36);

    if (this.settings.showSubtitles) {
      this.onSubtitle?.('[Bạn hụt hơi thở gấp!]');
    }
  }

  public playScareStinger(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const freqs = [145, 205, 310];
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.55, now + 0.55);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.62);
    }
    if (this.settings.showSubtitles) {
      this.onSubtitle?.('[Âm thanh chói tai rợn người vang lên]');
    }
  }

  public playChaseStart(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(88, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.35);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.58);

    if (this.settings.showSubtitles) {
      this.onSubtitle?.('[Cái Bóng đã phát hiện ra bạn!]');
    }
  }

  public playGhostStun(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.45);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);

    if (this.settings.showSubtitles) {
      this.onSubtitle?.('[Tiếng rít chói lòa — Cái Bóng khựng lại!]');
    }
  }

  public playCaughtJumpscare(): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 620;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.4, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    src.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    src.start(now, 0, 0.78);

    const osc = this.ctx.createOscillator();
    const oGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.65);
    oGain.gain.setValueAtTime(0.32, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(oGain);
    oGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.72);
  }

  public updateHeartbeat(dt: number, intensity01: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const clamped = Math.max(0, Math.min(1, intensity01));
    if (clamped < 0.18) {
      this.heartbeatTimer = 0;
      return;
    }

    const interval = 1.05 - clamped * 0.58; // ~1.05s chậm -> ~0.47s dồn dập
    this.heartbeatTimer -= dt;
    if (this.heartbeatTimer > 0) return;
    this.heartbeatTimer = interval;

    const now = this.ctx.currentTime;
    const vol = 0.08 + clamped * 0.24;

    const beat = (offset: number, startFreq: number, amp: number) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 0.11);
      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.14);
    };

    beat(0, 62, vol);
    beat(0.16, 50, vol * 0.72);
  }

  public updateListener(
    x: number,
    y: number,
    z: number,
    forwardX: number,
    forwardY: number,
    forwardZ: number,
  ): void {
    if (!this.ctx) return;
    const listener = this.ctx.listener;
    if (listener.positionX) {
      listener.positionX.value = x;
      listener.positionY.value = y;
      listener.positionZ.value = z;
      listener.forwardX.value = forwardX;
      listener.forwardY.value = forwardY;
      listener.forwardZ.value = forwardZ;
      listener.upX.value = 0;
      listener.upY.value = 1;
      listener.upZ.value = 0;
    }
  }

  public tickSubtitleCooldowns(dt: number): void {
    if (this.ghostStepSubTimer > 0) {
      this.ghostStepSubTimer = Math.max(0, this.ghostStepSubTimer - dt);
    }
  }

  public emitSubtitle(text: string): void {
    if (this.settings.showSubtitles) {
      this.onSubtitle?.(text);
    }
  }

  public notifyGhostFootstepSubtitle(isChase: boolean): void {
    if (!this.settings.showSubtitles || this.ghostStepSubTimer > 0) return;
    this.ghostStepSubTimer = isChase ? 2.4 : 4.0;
    this.onSubtitle?.(
      isChase
        ? '[Tiếng bước chân dồn dập đang lao tới gần!]'
        : '[Tiếng bước chân nặng nề lẩn khuất gần đây...]',
    );
  }

  public dispose(): void {
    try {
      this.droneOsc?.stop();
      this.droneSubOsc?.stop();
      this.droneHarmOsc?.stop();
      this.droneLfo?.stop();
      void this.ctx?.close();
    } catch {
      // Bỏ qua lỗi khi đóng AudioContext đã đóng
    }
    this.ctx = null;
  }
}
