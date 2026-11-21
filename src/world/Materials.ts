import * as THREE from 'three';

// Thư viện vật liệu và texture tạo hoàn toàn bằng CanvasTexture procedural

export class MaterialLibrary {
  private textures: THREE.Texture[] = [];
  private materials: THREE.Material[] = [];

  public readonly woodFloor: THREE.MeshStandardMaterial;
  public readonly plasterWall: THREE.MeshStandardMaterial;
  public readonly ceiling: THREE.MeshStandardMaterial;
  public readonly kitchenTile: THREE.MeshStandardMaterial;
  public readonly concrete: THREE.MeshStandardMaterial;
  public readonly furnitureWood: THREE.MeshStandardMaterial;
  public readonly doorWood: THREE.MeshStandardMaterial;
  public readonly metalDark: THREE.MeshStandardMaterial;
  public readonly metalRust: THREE.MeshStandardMaterial;
  public readonly fabricSofa: THREE.MeshStandardMaterial;
  public readonly bedding: THREE.MeshStandardMaterial;
  public readonly clockFace: THREE.MeshStandardMaterial;
  public readonly talisman: THREE.MeshStandardMaterial;
  public readonly keypad: THREE.MeshStandardMaterial;
  public readonly ritualCircle: THREE.MeshStandardMaterial;
  public readonly maiPainting: THREE.MeshStandardMaterial;
  public readonly maiClueOverlay: THREE.MeshStandardMaterial;
  public readonly paperNote: THREE.MeshStandardMaterial;
  public readonly goldMetal: THREE.MeshStandardMaterial;
  public readonly batteryAccent: THREE.MeshStandardMaterial;
  public readonly moonGlass: THREE.MeshStandardMaterial;
  public readonly brickDark: THREE.MeshStandardMaterial;
  public readonly candleWax: THREE.MeshStandardMaterial;
  public readonly emberGlow: THREE.MeshStandardMaterial;

  constructor(maxAnisotropy: number) {
    const aniso = Math.min(Math.max(1, maxAnisotropy), 8);

    const woodTex = this.createWoodPlankTexture(512, 512, '#3a2619', '#25170f');
    woodTex.repeat.set(3, 3);
    woodTex.anisotropy = aniso;

    const plasterTex = this.createPlasterTexture(512, 512);
    plasterTex.repeat.set(2, 1.5);
    plasterTex.anisotropy = aniso;

    const ceilingTex = this.createCeilingTexture(512, 512);
    ceilingTex.repeat.set(2, 2);

    const tileTex = this.createTileTexture(512, 512);
    tileTex.repeat.set(4, 4);
    tileTex.anisotropy = aniso;

    const concreteTex = this.createConcreteTexture(512, 512);
    concreteTex.repeat.set(3, 3);
    concreteTex.anisotropy = aniso;

    const furnWoodTex = this.createWoodPlankTexture(256, 256, '#462e1f', '#2d1c12');
    furnWoodTex.anisotropy = aniso;

    const brickTex = this.createBrickTexture(256, 256);
    brickTex.repeat.set(2, 2);

    const clockTex = this.createClockTexture(256, 256);
    const talismanTex = this.createTalismanTexture(128, 256);
    const keypadTex = this.createKeypadTexture(256, 384);
    const ritualTex = this.createRitualCircleTexture(512, 512);
    const paintingTex = this.createMaiPaintingTexture(256, 256);
    const maiClueTex = this.createMaiClueTexture(256, 256);

    this.woodFloor = this.regMat(
      new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.78,
        metalness: 0.05,
      }),
    );

    this.plasterWall = this.regMat(
      new THREE.MeshStandardMaterial({
        map: plasterTex,
        roughness: 0.92,
        metalness: 0.02,
      }),
    );

    this.ceiling = this.regMat(
      new THREE.MeshStandardMaterial({
        map: ceilingTex,
        roughness: 0.95,
        metalness: 0.0,
      }),
    );

    this.kitchenTile = this.regMat(
      new THREE.MeshStandardMaterial({
        map: tileTex,
        roughness: 0.65,
        metalness: 0.08,
      }),
    );

    this.concrete = this.regMat(
      new THREE.MeshStandardMaterial({
        map: concreteTex,
        roughness: 0.94,
        metalness: 0.04,
      }),
    );

    this.furnitureWood = this.regMat(
      new THREE.MeshStandardMaterial({
        map: furnWoodTex,
        roughness: 0.68,
        metalness: 0.08,
      }),
    );

    this.doorWood = this.regMat(
      new THREE.MeshStandardMaterial({
        map: furnWoodTex,
        color: 0x8e725c,
        roughness: 0.74,
        metalness: 0.06,
      }),
    );

    this.metalDark = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0x3b4046,
        roughness: 0.35,
        metalness: 0.85,
      }),
    );

    this.metalRust = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0x4b3830,
        roughness: 0.72,
        metalness: 0.58,
      }),
    );

    this.fabricSofa = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0x392b2c,
        roughness: 0.92,
        metalness: 0.02,
      }),
    );

    this.bedding = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0x56545a,
        roughness: 0.9,
        metalness: 0.02,
      }),
    );

    this.clockFace = this.regMat(
      new THREE.MeshStandardMaterial({
        map: clockTex,
        roughness: 0.45,
        metalness: 0.1,
      }),
    );

    this.talisman = this.regMat(
      new THREE.MeshStandardMaterial({
        map: talismanTex,
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
    );

    this.keypad = this.regMat(
      new THREE.MeshStandardMaterial({
        map: keypadTex,
        roughness: 0.4,
        metalness: 0.4,
        emissive: new THREE.Color(0x220404),
        emissiveIntensity: 0.8,
      }),
    );

    this.ritualCircle = this.regMat(
      new THREE.MeshStandardMaterial({
        map: ritualTex,
        transparent: true,
        roughness: 0.9,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );

    this.maiPainting = this.regMat(
      new THREE.MeshStandardMaterial({
        map: paintingTex,
        roughness: 0.88,
        metalness: 0.02,
      }),
    );

    this.maiClueOverlay = this.regMat(
      new THREE.MeshStandardMaterial({
        map: maiClueTex,
        transparent: true,
        opacity: 0,
        emissive: new THREE.Color(0x991b1b),
        emissiveIntensity: 0.7,
        depthWrite: false,
      }),
    );

    this.paperNote = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0xd4c7a9,
        roughness: 0.88,
        metalness: 0.0,
      }),
    );

    this.goldMetal = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0xb89342,
        roughness: 0.3,
        metalness: 0.85,
      }),
    );

    this.batteryAccent = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0x264b6e,
        roughness: 0.45,
        metalness: 0.3,
      }),
    );

    this.moonGlass = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0x22334c,
        emissive: new THREE.Color(0x132033),
        emissiveIntensity: 0.7,
        roughness: 0.25,
        metalness: 0.15,
        transparent: true,
        opacity: 0.65,
      }),
    );

    this.brickDark = this.regMat(
      new THREE.MeshStandardMaterial({
        map: brickTex,
        roughness: 0.92,
        metalness: 0.04,
      }),
    );

    this.candleWax = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0xc8bfa8,
        roughness: 0.6,
        metalness: 0.02,
      }),
    );

    this.emberGlow = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0x3b120b,
        emissive: new THREE.Color(0x7a1c0a),
        emissiveIntensity: 0.55,
        roughness: 0.8,
      }),
    );
  }

  private regTex(canvas: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    if (repeat) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    this.textures.push(tex);
    return tex;
  }

  private regMat<T extends THREE.Material>(mat: T): T {
    this.materials.push(mat);
    return mat;
  }

  private createWoodPlankTexture(w: number, h: number, baseHex: string, darkHex: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);

    const planks = 6;
    const plankH = h / planks;
    for (let i = 0; i < planks; i++) {
      const y = i * plankH;
      const shade = (i % 3) * 8 - 8;
      ctx.fillStyle = i % 2 === 0 ? baseHex : darkHex;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, y, w, plankH - 2);
      ctx.globalAlpha = 1;

      // Vân gỗ
      ctx.strokeStyle = `rgba(12, 8, 5, ${0.22 + (shade > 0 ? 0.08 : 0)})`;
      ctx.lineWidth = 1.5;
      for (let g = 0; g < 14; g++) {
        const gy = y + 4 + ((g * 19 + i * 7) % (plankH - 8));
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(w * 0.33, gy + Math.sin(g) * 4, w * 0.66, gy - Math.cos(g) * 4, w, gy);
        ctx.stroke();
      }

      // Khe ván
      ctx.fillStyle = '#0f0906';
      ctx.fillRect(0, y + plankH - 2, w, 2);

      // Mối nối dọc xen kẽ
      const seamX = ((i * 173 + 90) % (w - 40)) + 20;
      ctx.fillRect(seamX, y, 2, plankH);
    }

    // Bụi ẩm
    this.addSpeckleNoise(ctx, w, h, 900, 0.08);
    return this.regTex(canvas);
  }

  private createPlasterTexture(w: number, h: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#534e48';
    ctx.fillRect(0, 0, w, h);

    // Vệt ẩm mốc loang lổ
    for (let i = 0; i < 24; i++) {
      const x = (i * 97) % w;
      const y = (i * 151) % h;
      const r = 35 + ((i * 23) % 75);
      const grad = ctx.createRadialGradient(x, y, 4, x, y, r);
      grad.addColorStop(0, 'rgba(26, 24, 21, 0.34)');
      grad.addColorStop(1, 'rgba(26, 24, 21, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Chân tường sẫm màu hơn
    const bottomGrad = ctx.createLinearGradient(0, h * 0.72, 0, h);
    bottomGrad.addColorStop(0, 'rgba(18, 16, 14, 0)');
    bottomGrad.addColorStop(1, 'rgba(18, 16, 14, 0.55)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);

    // Vết nứt nhỏ
    ctx.strokeStyle = 'rgba(20, 17, 15, 0.45)';
    ctx.lineWidth = 1.2;
    for (let c = 0; c < 5; c++) {
      let cx = 60 + c * 95;
      let cy = 70 + (c % 2) * 140;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 6; s++) {
        cx += ((s % 2 === 0 ? 1 : -1) * 12) + 4;
        cy += 22;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    this.addSpeckleNoise(ctx, w, h, 1400, 0.06);
    return this.regTex(canvas);
  }

  private createCeilingTexture(w: number, h: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#3b3936';
    ctx.fillRect(0, 0, w, h);
    this.addSpeckleNoise(ctx, w, h, 1000, 0.08);
    return this.regTex(canvas);
  }

  private createTileTexture(w: number, h: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2d2f30';
    ctx.fillRect(0, 0, w, h);

    const grid = 4;
    const cell = w / grid;
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const isDark = (x + y) % 2 === 0;
        ctx.fillStyle = isDark ? '#343638' : '#53514b';
        ctx.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
      }
    }
    this.addSpeckleNoise(ctx, w, h, 900, 0.09);
    return this.regTex(canvas);
  }

  private createConcreteTexture(w: number, h: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#343638';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 20; i++) {
      const x = (i * 113) % w;
      const y = (i * 71) % h;
      const r = 30 + ((i * 29) % 60);
      const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
      grad.addColorStop(0, 'rgba(14, 15, 16, 0.42)');
      grad.addColorStop(1, 'rgba(14, 15, 16, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    this.addSpeckleNoise(ctx, w, h, 1600, 0.1);
    return this.regTex(canvas);
  }

  private createBrickTexture(w: number, h: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1f1918';
    ctx.fillRect(0, 0, w, h);

    const rows = 8;
    const cols = 4;
    const rh = h / rows;
    const cw = w / cols;

    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 0 ? 0 : cw * 0.5;
      for (let c = -1; c <= cols; c++) {
        ctx.fillStyle = (r + c) % 3 === 0 ? '#3f221d' : '#321c18';
        ctx.fillRect(c * cw + offset + 2, r * rh + 2, cw - 4, rh - 4);
      }
    }
    this.addSpeckleNoise(ctx, w, h, 500, 0.08);
    return this.regTex(canvas);
  }

  private createClockTexture(w: number, h: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const cx = w / 2;
    const cy = h / 2;
    const r = w * 0.44;

    ctx.fillStyle = '#1d1610';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#d7ccb4';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2b1e12';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Vạch giờ
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r * 0.78), cy + Math.sin(a) * (r * 0.78));
      ctx.lineTo(cx + Math.cos(a) * (r * 0.9), cy + Math.sin(a) * (r * 0.9));
      ctx.lineWidth = i % 3 === 0 ? 4 : 2;
      ctx.stroke();
    }

    // Kim dừng đúng 03:17
    // Kim giờ: 3 + 17/60 -> góc (3.283 / 12) * 2PI - PI/2
    const hourAngle = ((3 + 17 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    const minAngle = (17 / 60) * Math.PI * 2 - Math.PI / 2;

    ctx.strokeStyle = '#17110d';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hourAngle) * (r * 0.52), cy + Math.sin(hourAngle) * (r * 0.52));
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(minAngle) * (r * 0.75), cy + Math.sin(minAngle) * (r * 0.75));
    ctx.stroke();

    ctx.fillStyle = '#6f1414';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    return this.regTex(canvas, false);
  }

  private createTalismanTexture(w: number, h: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#b99646';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#7c1712';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // Ký tự bùa cổ
    ctx.beginPath();
    ctx.moveTo(w / 2, 26);
    ctx.lineTo(w / 2, h - 30);
    for (let y = 48; y < h - 45; y += 28) {
      ctx.moveTo(26, y);
      ctx.lineTo(w - 26, y + 10);
      ctx.moveTo(w - 26, y);
      ctx.lineTo(26, y + 12);
    }
    ctx.stroke();
    this.addSpeckleNoise(ctx, w, h, 180, 0.12);
    return this.regTex(canvas, false);
  }

  private createKeypadTexture(w: number, h: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1b1e23';
    ctx.fillRect(0, 0, w, h);

    // Màn hình nhỏ
    ctx.fillStyle = '#0e1712';
    ctx.fillRect(24, 24, w - 48, 60);
    ctx.strokeStyle = '#333b42';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, w - 48, 60);

    // Đèn đỏ báo khóa
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(w - 40, 54, 8, 0, Math.PI * 2);
    ctx.fill();

    // Lưới phím 3x4
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    const padX = 28;
    const padY = 110;
    const btnW = (w - 56 - 16) / 3;
    const btnH = 48;

    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    keys.forEach((k, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const bx = padX + col * (btnW + 8);
      const by = padY + row * (btnH + 10);
      ctx.fillStyle = '#2d323a';
      ctx.fillRect(bx, by, btnW, btnH);
      ctx.fillStyle = '#cfd5dc';
      ctx.fillText(k, bx + btnW / 2, by + btnH / 2);
    });

    return this.regTex(canvas, false);
  }

  private createRitualCircleTexture(w: number, h: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(138, 28, 24, 0.72)';
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.44, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.36, 0, Math.PI * 2);
    ctx.stroke();

    // Ngôi sao 5 cánh
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = cx + Math.cos(angle) * (w * 0.35);
      const py = cy + Math.sin(angle) * (w * 0.35);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    return this.regTex(canvas, false);
  }

  private createMaiPaintingTexture(w: number, h: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#cbc1aa';
    ctx.fillRect(0, 0, w, h);

    // Nét vẽ trẻ con: 3 người và ngôi nhà
    ctx.strokeStyle = '#2a2420';
    ctx.lineWidth = 3;
    ctx.strokeRect(42, 110, 80, 70);
    ctx.beginPath();
    ctx.moveTo(35, 110);
    ctx.lineTo(82, 68);
    ctx.lineTo(130, 110);
    ctx.stroke();

    // Ba nhân vật nét nguệch ngoạc
    [155, 185, 212].forEach((px, idx) => {
      const py = idx === 2 ? 155 : 138;
      ctx.beginPath();
      ctx.arc(px, py, idx === 2 ? 8 : 11, 0, Math.PI * 2);
      ctx.moveTo(px, py + 11);
      ctx.lineTo(px, 185);
      ctx.stroke();
    });

    // Chữ "21" đã được tách sang lớp phủ maiClueOverlay chỉ hiện khi chiếu đèn pin < 2 m
    return this.regTex(canvas, false);
  }

  private createMaiClueTexture(w: number, h: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(155, 22, 22, 0.95)';
    ctx.font = 'bold 34px serif';
    ctx.fillText('21', 176, 68);
    ctx.font = '14px serif';
    ctx.fillText('Sinh nhật Mai', 142, 86);

    return this.regTex(canvas, false);
  }

  private addSpeckleNoise(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    count: number,
    alpha: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const x = (i * 73 + (i % 13) * 19) % w;
      const y = (i * 137 + (i % 7) * 29) % h;
      ctx.fillStyle = i % 2 === 0 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.45})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  public dispose(): void {
    for (const t of this.textures) t.dispose();
    for (const m of this.materials) m.dispose();
    this.textures = [];
    this.materials = [];
  }
}
