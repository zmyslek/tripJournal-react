import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import paperBackground from '../assets/wrinkled-paper.png';
import { useEffect, useRef } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

type GL = Renderer['gl'];

type MutableTexture = Texture & {
  update?: () => void;
  needsUpdate?: boolean;
};

function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number) {
  let timeout: number;
  return function (this: unknown, ...args: Parameters<T>) {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => func.apply(this, args), wait);
  };
}

function lerp(p1: number, p2: number, t: number): number {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance: object): void {
  const boundInstance = instance as Record<string, unknown>;
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach(key => {
    if (key !== 'constructor' && typeof boundInstance[key] === 'function') {
      const method = boundInstance[key] as (this: unknown, ...args: unknown[]) => unknown;
      boundInstance[key] = method.bind(instance);
    }
  });
}

function getFontSize(font: string): number {
  const match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 30;
}

function createTextTexture(
  gl: GL,
  text: string,
  font: string = 'bold 30px monospace',
  color: string = 'black'
): { texture: Texture; width: number; height: number } {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get 2d context');

  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const fontSize = getFontSize(font);
  const textHeight = Math.ceil(fontSize * 1.2);

  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;

  context.font = font;
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

interface TitleProps {
  gl: GL;
  plane: Mesh;
  renderer: Renderer;
  text: string;
  textColor?: string;
  font?: string;
}

class Title {
  gl: GL;
  plane: Mesh;
  renderer: Renderer;
  text: string;
  textColor: string;
  font: string;
  mesh!: Mesh;

  constructor({ gl, plane, renderer, text, textColor = '#545050', font = '30px sans-serif' }: TitleProps) {
    autoBind(this);
    this.gl = gl;
    this.plane = plane;
    this.renderer = renderer;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }

  createMesh() {
    const { texture } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true
    });
    this.mesh = new Mesh(this.gl, { geometry, program });
    this.mesh.setParent(this.plane);
  }
}

interface ScreenSize {
  width: number;
  height: number;
}

interface Viewport {
  width: number;
  height: number;
}

interface MediaProps {
  geometry: Plane;
  gl: GL;
  image: string;
  index: number;
  length: number;
  renderer: Renderer;
  scene: Transform;
  screen: ScreenSize;
  text: string;
  viewport: Viewport;
  bend: number;
  textColor: string;
  borderRadius?: number;
  font?: string;
  loadImmediately?: boolean;
}

class Media {
  extra: number = 0;
  targetScale: number = 1;
  currentScale: number = 1;
  baseScaleX: number = 1;
  baseScaleY: number = 1;
  geometry: Plane;
  gl: GL;
  image: string;
  index: number;
  length: number;
  renderer: Renderer;
  scene: Transform;
  screen: ScreenSize;
  text: string;
  viewport: Viewport;
  bend: number;
  textColor: string;
  borderRadius: number;
  font?: string;
  texture!: Texture;
  program!: Program;
  plane!: Mesh;
  title?: Title;
  scale!: number;
  padding!: number;
  width!: number;
  widthTotal!: number;
  x!: number;
  speed: number = 0;
  isBefore: boolean = false;
  isAfter: boolean = false;
  imageLoaded: boolean = false;
  imageLoading: boolean = false;
  loadImmediately: boolean = false;

  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    renderer,
    scene,
    screen,
    text,
    viewport,
    bend,
    textColor,
    borderRadius = 0,
    font,
    loadImmediately = false
  }: MediaProps) {
    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.renderer = renderer;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.loadImmediately = loadImmediately;
    this.createShader();
    this.createMesh();
    if (this.text.trim()) {
      this.createTitle();
    }
    this.onResize();
  }

  createShader() {
    this.texture = new Texture(this.gl, {
      generateMipmaps: false
    });
    // set safe sampling parameters for NPOT images
    try {
      const glConst = this.gl as WebGLRenderingContext;
      (this.texture as any).minFilter = glConst.LINEAR;
      (this.texture as any).magFilter = glConst.LINEAR;
      (this.texture as any).wrapS = glConst.CLAMP_TO_EDGE;
      (this.texture as any).wrapT = glConst.CLAMP_TO_EDGE;
    } catch {
      // ignore if OGL build does not expose gl constants here
    }
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;
        
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        
        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          
          // Smooth antialiasing for edges
          float edgeSmooth = 0.002;
          float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);
          
          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: this.texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [1, 1] },
        uBorderRadius: { value: this.borderRadius }
      },
      transparent: true
    });
    if (this.loadImmediately) {
      this.loadImage();
    }
  }

  loadImage() {
    if (this.imageLoaded || this.imageLoading) {
      return;
    }

    this.imageLoading = true;
    const img = new Image();
    if (/^https?:\/\//i.test(this.image)) {
      img.crossOrigin = 'anonymous';
    }

    try {
      (img as any).decoding = 'async';
      (img as any).loading = 'eager';
    } catch {
      // ignore if not supported
    }

    img.onload = () => {
      try {
        const MAX_DIM = 960;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        let scale = 1;
        if (w > MAX_DIM || h > MAX_DIM) {
          scale = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        if (scale < 1) {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            this.texture.image = canvas;
          } else {
            this.texture.image = img;
          }
        } else {
          this.texture.image = img;
        }
      } catch {
        this.texture.image = img;
      }
      try {
        const actualWidth = (this.texture.image && (this.texture.image as HTMLImageElement | HTMLCanvasElement).width) || img.naturalWidth;
        const actualHeight = (this.texture.image && (this.texture.image as HTMLImageElement | HTMLCanvasElement).height) || img.naturalHeight;
        const isPOT = (v: number) => (v & (v - 1)) === 0;
        const pot = isPOT(actualWidth) && isPOT(actualHeight);
        this.texture.generateMipmaps = pot;
        try {
          const glConst = this.gl as WebGLRenderingContext;
          const mutableTexture = this.texture as MutableTexture;
          if (!pot) {
            mutableTexture.minFilter = glConst.LINEAR;
            mutableTexture.magFilter = glConst.LINEAR;
            mutableTexture.wrapS = glConst.CLAMP_TO_EDGE;
            mutableTexture.wrapT = glConst.CLAMP_TO_EDGE;
          } else {
            mutableTexture.minFilter = glConst.LINEAR_MIPMAP_LINEAR || glConst.LINEAR;
            mutableTexture.magFilter = glConst.LINEAR;
          }
        } catch {
          // ignore
        }

        try {
          if ((this.texture as any).update) (this.texture as any).update();
          else (this.texture as any).needsUpdate = true;
        } catch {
          (this.texture as any).needsUpdate = true;
        }
        this.program.uniforms.uImageSizes.value = [actualWidth, actualHeight];
        this.imageLoaded = true;
      } catch {
        try {
          if ((this.texture as any).update) (this.texture as any).update();
          else (this.texture as any).needsUpdate = true;
        } catch {
          (this.texture as any).needsUpdate = true;
        }
        this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
        this.imageLoaded = true;
      }
      this.imageLoading = false;
    };

    img.onerror = () => {
      console.error('[CircularGallery] image load error', this.image);
      // Fallback to a lightweight placeholder so the shader always has a valid image
      try {
        const fallbackImg = new Image();
        fallbackImg.src = paperBackground;
        fallbackImg.onload = () => {
          try {
            this.texture.image = fallbackImg;
            const mutableTexture = this.texture as MutableTexture;
            if (mutableTexture.update) mutableTexture.update();
            else mutableTexture.needsUpdate = true;
          } catch {
            (this.texture as MutableTexture).needsUpdate = true;
          }
          this.program.uniforms.uImageSizes.value = [fallbackImg.naturalWidth || 1, fallbackImg.naturalHeight || 1];
          this.imageLoaded = true;
          this.imageLoading = false;
        };
        fallbackImg.onerror = () => {
          this.imageLoading = false;
        };
      } catch {
        this.imageLoading = false;
      }
    };

    img.src = this.image;
  }

  ensureLoaded(viewportWidth: number) {
    if (this.imageLoaded || this.imageLoading) {
      return;
    }

    if (Math.abs(this.plane.position.x) <= viewportWidth * 0.85) {
      this.loadImage();
    }
  }

  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    });
    this.plane.setParent(this.scene);
  }

  createTitle() {
    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.text,
      textColor: this.textColor,
      font: this.font
    });
  }

  update(scroll: { current: number; last: number }, direction: 'right' | 'left') {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const B_abs = Math.abs(this.bend);
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);

      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    const planeOffset = (this.plane.scale.x * this.currentScale) / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === 'right' && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === 'left' && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }

  onResize({
    screen,
    viewport,
    sizing
  }: { screen?: ScreenSize; viewport?: Viewport; sizing?: { widthFactor: number; heightFactor: number } } = {}) {
    if (screen) this.screen = screen;
    if (viewport) {
      this.viewport = viewport;
      if (this.plane.program.uniforms.uViewportSizes) {
        this.plane.program.uniforms.uViewportSizes.value = [this.viewport.width, this.viewport.height];
      }
    }
    const widthFactor = sizing?.widthFactor ?? 0.4032;
    const heightFactor = sizing?.heightFactor ?? 0.6624;
    const scaleY = this.viewport.height * heightFactor;
    const scaleX = Math.min(this.viewport.width * widthFactor, scaleY * 0.68);
    // store base scales and apply currentScale multiplier for hover effect
    this.baseScaleX = scaleX;
    this.baseScaleY = scaleY;
    this.plane.scale.y = scaleY * this.currentScale;
    this.plane.scale.x = scaleX * this.currentScale;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.padding = 2;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }

  setHover(isHover: boolean) {
    this.targetScale = isHover ? 1.08 : 1;
  }

  applyScaleInterpolation() {
    this.currentScale = lerp(this.currentScale, this.targetScale, 0.12);
    this.plane.scale.x = this.baseScaleX * this.currentScale;
    this.plane.scale.y = this.baseScaleY * this.currentScale;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
  }
}

interface AppConfig {
  items?: { image: string; text: string }[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  scrollSpeed?: number;
  scrollEase?: number;
  onItemClick?: (item: { image: string; text: string }) => void;
}

class App {
  container: HTMLElement;
  onItemClick?: (item: { image: string; text: string }) => void;
  scrollSpeed: number;
  scroll: {
    ease: number;
    current: number;
    target: number;
    last: number;
    position?: number;
  };
  onCheckDebounce: () => void;
  renderer!: Renderer;
  gl!: GL;
  camera!: Camera;
  scene!: Transform;
  planeGeometry!: Plane;
  medias: Media[] = [];
  mediasImages: { image: string; text: string }[] = [];
  screen!: { width: number; height: number };
  viewport!: { width: number; height: number };
  raf: number = 0;
  paused: boolean = false;

  boundOnResize!: () => void;
  boundOnWheel!: (e: Event) => void;
  boundOnTouchDown!: (e: MouseEvent | TouchEvent) => void;
  boundOnTouchMove!: (e: MouseEvent | TouchEvent) => void;
  boundOnTouchUp!: (e: MouseEvent | TouchEvent) => void;

  isDown: boolean = false;
  start: number = 0;
  startY: number = 0;

  constructor(
    container: HTMLElement,
    {
      items,
      bend = 1,
      textColor = '#ffffff',
      borderRadius = 0,
      font = 'bold 30px Figtree',
      scrollSpeed = 2,
      scrollEase = 0.05,
      onItemClick
    }: AppConfig
  ) {
    document.documentElement.classList.remove('no-js');
    this.container = container;
    this.onItemClick = onItemClick;
    this.container.style.cursor = 'grab';
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(this.onCheck.bind(this), 200);
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(items, bend, textColor, borderRadius, font);
    this.update();
    this.addEventListeners();
  }

  createRenderer() {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      // cap DPR to reduce GPU load and texture upload cost
      dpr: Math.min(window.devicePixelRatio || 1, 1.5)
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
    // ensure container is a stacking context and canvas sits behind overlays
    try {
      if (this.container.style.position === '' || this.container.style.position === 'static') {
        this.container.style.position = 'relative';
      }
    } catch {
      // ignore
    }
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0';
    this.container.appendChild(canvas);
  }

  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }

  createScene() {
    this.scene = new Transform();
  }

  createGeometry() {
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 10,
      widthSegments: 20
    });
  }

  createMedias(
    items: { image: string; text: string }[] | undefined,
    bend: number = 1,
    textColor: string,
    borderRadius: number,
    font: string
  ) {
    const galleryItems = items ?? [];
    const preloadCount = this.screen.width < 768 ? 2 : 3;
    this.mediasImages = galleryItems;
    this.medias = this.mediasImages.map((data, index) => {
      return new Media({
        geometry: this.planeGeometry,
        gl: this.gl,
        image: data.image,
        index,
        length: this.mediasImages.length,
        renderer: this.renderer,
        scene: this.scene,
        screen: this.screen,
        text: data.text,
        viewport: this.viewport,
        bend,
        textColor,
        borderRadius,
        font,
        loadImmediately: index < preloadCount
      });
    });
  }

  onTouchDown(e: MouseEvent | TouchEvent) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    const point = this.getPointerPoint(e);
    this.start = point.clientX;
    this.startY = point.clientY;
    this.container.style.cursor = 'grabbing';
  }

  onTouchMove(e: MouseEvent | TouchEvent) {
    const point = this.getPointerPoint(e);
    if (!this.isDown) {
      const rect = this.container.getBoundingClientRect();
      const isInside =
        point.clientX >= rect.left &&
        point.clientX <= rect.right &&
        point.clientY >= rect.top &&
        point.clientY <= rect.bottom;

      if (!isInside) {
        this.container.style.cursor = 'grab';
        this.medias.forEach(media => media.setHover(false));
        return;
      }

      const hoveredIndex = this.getItemIndexAt(point.clientX, point.clientY);
      this.container.style.cursor = hoveredIndex >= 0 ? 'pointer' : 'grab';
      this.medias.forEach((m, i) => m.setHover(i === hoveredIndex));
      return;
    }

    if ('cancelable' in e && e.cancelable) {
      e.preventDefault();
    }

    const distance = (this.start - point.clientX) * (this.scrollSpeed * 0.025);
    this.scroll.target = (this.scroll.position ?? 0) + distance;
  }

  onTouchUp(e: MouseEvent | TouchEvent) {
    const point = this.getPointerPoint(e);
    const movedDistance = Math.abs(point.clientX - this.start) + Math.abs(point.clientY - this.startY);
    if (movedDistance < 8) {
      const clickedItem = this.getItemAt(point.clientX, point.clientY);
      if (clickedItem && this.onItemClick) {
        this.onItemClick(clickedItem);
      }
    }

    this.isDown = false;
    this.onCheck();
    this.container.style.cursor = 'grab';
  }

  onWheel(e: Event) {
    const wheelEvent = e as WheelEvent;
    if (wheelEvent.cancelable) {
      wheelEvent.preventDefault();
    }

    const legacyWheelEvent = wheelEvent as WheelEvent & { wheelDelta?: number; detail?: number };
    const delta = wheelEvent.deltaY || legacyWheelEvent.wheelDelta || legacyWheelEvent.detail || 0;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounce();
  }

  onCheck() {
    if (!this.medias || !this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  onResize() {
    this.screen = {
      width: this.container.clientWidth,
      height: this.container.clientHeight
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({
      aspect: this.screen.width / this.screen.height
    });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    const isMobile = this.screen.width < 768;
    const widthFactor = isMobile ? 0.3168 : 0.4032;
    const heightFactor = isMobile ? 0.5184 : 0.6624;
    if (this.medias) {
      this.medias.forEach(media => media.onResize({ screen: this.screen, viewport: this.viewport, sizing: { widthFactor, heightFactor } }));
    }
  }

  getPointerPoint(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
    if ('touches' in e && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }

    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    }

    if ('clientX' in e && 'clientY' in e) {
      return { clientX: e.clientX, clientY: e.clientY };
    }

    return { clientX: 0, clientY: 0 };
  }

  getItemAt(clientX: number, clientY: number): { image: string; text: string } | null {
    const rect = this.container.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    let closestIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;

    this.medias.forEach((media, index) => {
      const centerX = ((media.plane.position.x / this.viewport.width) + 0.5) * this.screen.width;
      const centerY = ((-media.plane.position.y / this.viewport.height) + 0.5) * this.screen.height;
      const halfWidth = (media.plane.scale.x / this.viewport.width) * this.screen.width * 0.5;
      const halfHeight = (media.plane.scale.y / this.viewport.height) * this.screen.height * 0.5;

      const isInside =
        localX >= centerX - halfWidth &&
        localX <= centerX + halfWidth &&
        localY >= centerY - halfHeight &&
        localY <= centerY + halfHeight;

      if (!isInside) {
        return;
      }

      const distance = Math.abs(centerX - localX) + Math.abs(centerY - localY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex >= 0 ? this.mediasImages[closestIndex] : null;
  }

  getItemIndexAt(clientX: number, clientY: number): number {
    const rect = this.container.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    let closestIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;

    this.medias.forEach((media, index) => {
      const centerX = ((media.plane.position.x / this.viewport.width) + 0.5) * this.screen.width;
      const centerY = ((-media.plane.position.y / this.viewport.height) + 0.5) * this.screen.height;
      const halfWidth = (media.plane.scale.x / this.viewport.width) * this.screen.width * 0.5;
      const halfHeight = (media.plane.scale.y / this.viewport.height) * this.screen.height * 0.5;

      const isInside =
        localX >= centerX - halfWidth &&
        localX <= centerX + halfWidth &&
        localY >= centerY - halfHeight &&
        localY <= centerY + halfHeight;

      if (!isInside) return;

      const distance = Math.abs(centerX - localX) + Math.abs(centerY - localY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
    if (this.medias) {
      this.medias.forEach(media => {
        media.update(this.scroll, direction);
        media.applyScaleInterpolation();
        media.ensureLoaded(this.viewport.width);
      });
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = window.requestAnimationFrame(this.update.bind(this));
  }

  addEventListeners() {
    this.boundOnResize = this.onResize.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnTouchDown = this.onTouchDown.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchUp = this.onTouchUp.bind(this);
    window.addEventListener('resize', this.boundOnResize);
    this.container.addEventListener('mousewheel', this.boundOnWheel);
    this.container.addEventListener('wheel', this.boundOnWheel, { passive: false });
    this.container.addEventListener('mousedown', this.boundOnTouchDown);
    window.addEventListener('mousemove', this.boundOnTouchMove);
    window.addEventListener('mouseup', this.boundOnTouchUp);
    this.container.addEventListener('touchstart', this.boundOnTouchDown);
    window.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
    window.addEventListener('touchend', this.boundOnTouchUp);
  }

  removeEventListeners() {
    window.removeEventListener('resize', this.boundOnResize);
    this.container.removeEventListener('mousewheel', this.boundOnWheel);
    this.container.removeEventListener('wheel', this.boundOnWheel);
    this.container.removeEventListener('mousedown', this.boundOnTouchDown);
    window.removeEventListener('mousemove', this.boundOnTouchMove);
    window.removeEventListener('mouseup', this.boundOnTouchUp);
    this.container.removeEventListener('touchstart', this.boundOnTouchDown);
    window.removeEventListener('touchmove', this.boundOnTouchMove);
    window.removeEventListener('touchend', this.boundOnTouchUp);
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.removeEventListeners();
    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas) {
      (this.renderer.gl.canvas as HTMLCanvasElement).style.pointerEvents = 'none';
    }

    try {
      window.cancelAnimationFrame(this.raf);
    } catch {
      /* ignore */
    }
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.addEventListeners();
    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas) {
      (this.renderer.gl.canvas as HTMLCanvasElement).style.pointerEvents = '';
    }

    try {
      this.update();
    } catch {
      /* ignore */
    }
  }

  destroy() {
    window.cancelAnimationFrame(this.raf);
    this.removeEventListeners();
    try {
      // Attempt to explicitly lose the GL context to free GPU resources
      const gl = this.renderer && this.renderer.gl;
      if (gl && typeof gl.getExtension === 'function') {
        const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context') as { loseContext?: () => void } | null;
        if (ext && typeof ext.loseContext === 'function') {
          try { ext.loseContext(); } catch { /* ignore */ }
        }
      }
    } catch {
      /* ignore */
    }

    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas.parentNode) {
      this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas as HTMLCanvasElement);
    }
  }
}

interface CircularGalleryProps {
  items?: { image: string; text: string }[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  scrollSpeed?: number;
  scrollEase?: number;
  onItemClick?: (item: { image: string; text: string }) => void;
  paused?: boolean;
}

export default function CircularGallery({
  items,
  bend = 3,
  textColor = '#ffffff',
  borderRadius = 0.05,
  font = 'bold 30px Figtree',
  scrollSpeed = 2,
  scrollEase = 0.05,
  onItemClick,
  paused = false
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<App | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const app = new App(containerRef.current, {
      items,
      bend,
      textColor,
      borderRadius,
      font,
      scrollSpeed,
      scrollEase,
      onItemClick
    });
    appRef.current = app;
    return () => {
      app.destroy();
      appRef.current = null;
    };
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase, onItemClick]);

  useEffect(() => {
    if (!appRef.current) return;
    if (paused) appRef.current.pause();
    else appRef.current.resume();
  }, [paused]);

  return <div className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing" ref={containerRef} />;
}
