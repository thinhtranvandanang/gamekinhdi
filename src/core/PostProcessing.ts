import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GAME_CONFIG } from '../config';
import { QualityLevel } from '../types';

// Hiệu ứng hậu kỳ kinh dị (film grain, vignette, chromatic aberration nhẹ)
// Tắt hoàn toàn khi đồ họa Thấp, Software WebGL, hoặc bật Giảm chớp sáng

const HorrorPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: GAME_CONFIG.POST_GRAIN_BASE },
    uVignette: { value: GAME_CONFIG.POST_VIGNETTE_BASE },
    uChromatic: { value: GAME_CONFIG.POST_CA_BASE },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uVignette;
    uniform float uChromatic;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233)) + uTime * 3.17) * 43758.5453);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered);

      vec3 col;
      if (uChromatic > 0.0001) {
        vec2 offset = centered * dist * uChromatic;
        col.r = texture2D(tDiffuse, clamp(vUv - offset, 0.001, 0.999)).r;
        col.g = texture2D(tDiffuse, vUv).g;
        col.b = texture2D(tDiffuse, clamp(vUv + offset, 0.001, 0.999)).b;
      } else {
        col = texture2D(tDiffuse, vUv).rgb;
      }

      // Film grain nhẹ
      float noise = (rand(vUv * vec2(800.0, 600.0)) - 0.5) * uGrain;
      col += noise;

      // Vignette tối 4 góc
      float vig = smoothstep(0.28, 0.88, dist);
      col *= 1.0 - vig * uVignette;

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export class PostProcessingPipeline {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly shaderPass: ShaderPass;
  private readonly isSoftwareGl: boolean;
  private enabled = false;
  private quality: QualityLevel = QualityLevel.Medium;
  private reduceFlash = false;
  private elapsed = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    isSoftwareGl: boolean,
  ) {
    this.renderer = renderer;
    this.isSoftwareGl = isSoftwareGl;
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.shaderPass = new ShaderPass(HorrorPostShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.shaderPass);
  }

  public configure(quality: QualityLevel, reduceFlash: boolean): void {
    this.quality = quality;
    this.reduceFlash = reduceFlash;
    this.enabled = !this.isSoftwareGl && !reduceFlash && quality !== QualityLevel.Low;
  }

  public setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  public updateUniforms(dt: number, tension01: number, isChase: boolean): void {
    if (!this.enabled) return;
    this.elapsed += dt;
    const t = Math.max(0, Math.min(1, tension01));
    const chaseBoost = isChase ? 0.35 : 0;
    const u = this.shaderPass.material.uniforms;
    u.uTime.value = this.elapsed;
    u.uGrain.value = GAME_CONFIG.POST_GRAIN_BASE + t * GAME_CONFIG.POST_GRAIN_TENSION;
    u.uVignette.value =
      GAME_CONFIG.POST_VIGNETTE_BASE + (t + chaseBoost * 0.5) * GAME_CONFIG.POST_VIGNETTE_TENSION;
    u.uChromatic.value =
      this.quality === QualityLevel.High
        ? GAME_CONFIG.POST_CA_BASE + (t + chaseBoost) * GAME_CONFIG.POST_CA_TENSION
        : 0;
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.enabled && !this.reduceFlash) {
      this.composer.render();
    } else {
      this.renderer.render(scene, camera);
    }
  }

  public dispose(): void {
    this.shaderPass.material.dispose();
    this.composer.dispose();
  }
}
