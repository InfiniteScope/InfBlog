/**
 * 「月之暗面」hero 场景（WebGL，源自用户的 moonshot 复刻原型）：
 * 日食月 + 棱镜彩虹光束 + 标题折射液化 + 扫描线颗粒，全在一个
 * fragment shader 里。本模块把原型 script.js 改造成可复用场景：
 *
 * - 首页 hero：parallax = true（鼠标牵引月亮，平滑跟随）
 * - 主题转场覆盖层：parallax = false，用 setMoon() 逐帧驱动月升
 *
 * 坐标系：uv（0~1，y 向上），R 以画面高度为单位（0.13 ≈ 26% 屏高直径）。
 */

export interface MoonSceneOptions {
  /** shader 内渲染的标题文字（文字纹理） */
  text: string
  /** 标题字体（canvas 2D 语法） */
  font?: string
  /** 鼠标牵引月亮（首页用；转场覆盖层关掉、由 setMoon 驱动） */
  parallax?: boolean
  /** 月亮基准位置（uv）。默认 (0.44, 0.5) —— hero 文本块的标题带中心 */
  base?: { x: number; y: number }
}

export interface MoonScene {
  /** 直接设定月亮（uv 坐标；r 可选覆盖默认半径，uv 高度单位） */
  setMoon(x: number, y: number, r?: number): void
  /** 暂停/恢复渲染（离屏时省 GPU） */
  setPaused(paused: boolean): void
  /** 手动触发重设尺寸（内部读 offsetWidth/offsetHeight；场景已用
      ResizeObserver 自动跟随画布尺寸，一般无需调用） */
  resize(): void
  /** 释放 GL 资源、停掉渲染循环 */
  dispose(): void
}

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMoon;
uniform float uR;
uniform sampler2D uText;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

float textAt(vec2 tp) {
  vec2 st = vec2(fract(tp.x), clamp(tp.y, 0.001, 0.999));
  return texture2D(uText, st).r;
}

vec3 spectrum(float x) {
  float r = smoothstep(0.55, 0.25, x) + 0.45 * smoothstep(0.80, 1.0, x);
  float g = smoothstep(0.10, 0.45, x) * smoothstep(0.85, 0.60, x);
  float b = smoothstep(0.45, 0.80, x);
  return vec3(r, g, b);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime;

  float density = 1.05;
  vec2 tp;
  tp.x = uv.x * aspect * density + t * 0.012;
  tp.y = (uv.y - 0.5) * 2.7 + 0.5;

  vec2 warp = vec2(
    fbm(uv * 2.6 + vec2(t * 0.10, 0.0)),
    fbm(uv * 2.6 + vec2(3.7, -t * 0.08))
  ) - 0.5;
  tp += warp * 0.07;
  tp.y += sin(tp.x * 9.0 + t * 1.1) * 0.006;
  tp.x += sin(uv.y * 7.0 - t * 0.7) * 0.004;

  vec2 m = uMoon;
  vec2 dvec = (uv - m) * vec2(aspect, 1.0);
  float d = length(dvec);
  float R = uR;

  float inside = smoothstep(R, R * 0.82, d);
  vec2 mTP = vec2(m.x * aspect * density + t * 0.012, (m.y - 0.5) * 2.7 + 0.5);
  vec2 tpLens = mTP + (tp - mTP) * 0.55;
  tp = mix(tp, tpLens, inside * 0.85);

  float smear = 0.004 + 0.008 * fbm(uv * 3.0 + t * 0.05);
  float m0 = textAt(tp);
  float mL = textAt(tp + vec2(smear, 0.0));
  float mR = textAt(tp - vec2(smear, 0.0));
  float mask = (m0 * 2.0 + mL + mR) * 0.25;

  vec2 ca = (d > 0.0001) ? (dvec / d) : vec2(0.0);
  float caStr = 0.0008 + 0.0035 * exp(-d * 3.5);
  vec3 textCol = vec3(
    textAt(tp + ca * caStr) * 0.6 + mask * 0.4,
    mask,
    textAt(tp - ca * caStr) * 0.6 + mask * 0.4
  );

  float stripes = 0.78 + 0.22 * sin(gl_FragCoord.y * 2.1);
  textCol *= stripes;

  float glowNear = exp(-d * 2.6);
  vec3 col = textCol * vec3(0.90, 0.93, 1.0) * (0.62 + 0.7 * glowNear);

  col *= 1.0 - inside * 0.88;

  float rim = smoothstep(0.006, 0.0, abs(d - R));
  col += vec3(0.65, 0.7, 0.8) * rim * 0.25;

  float lightAng = -1.27 + t * 0.2;
  vec2 L = vec2(cos(lightAng), sin(lightAng));
  float side = smoothstep(-0.15, 0.85, dot(dvec / max(d, 1e-4), L));
  float band = smoothstep(0.016, 0.0, abs(d - R + 0.008));
  col += vec3(1.0) * band * side * 0.65;
  col += vec3(0.95, 0.97, 1.0) * smoothstep(R, R - 0.14, d) * inside * side * 0.18;
  col += vec3(0.75, 0.82, 1.0) * exp(-max(d - R, 0.0) * 7.0) * (0.06 + 0.22 * side);

  vec2 S = (vec2(-0.08, 0.60) - m) * vec2(aspect, 1.0); 
  float srcDist = length(S);
  vec2 bdir = normalize(-S);                            
  float along = dot(dvec, bdir);                        
  float perp = dot(dvec, vec2(-bdir.y, bdir.x));        

  float beamCore = smoothstep(0.0045, 0.0, abs(perp));
  float beamGlow = smoothstep(0.030, 0.0, abs(perp));
  float beamSeg = smoothstep(-srcDist, -srcDist + 0.05, along)
                * (1.0 - smoothstep(-R - 0.01, -R + 0.01, along));
  col += vec3(1.0) * (beamCore * 0.55 + beamGlow * 0.18) * beamSeg;

  col += vec3(1.0) * smoothstep(0.008, 0.0, abs(perp)) * inside * 0.10;

  float dev = atan(perp, max(along, 1e-4));             
  float sp = (dev - 0.045) / (0.20 - 0.045);
  float inFan = step(0.0, sp) * step(sp, 1.0) * step(R, along);
  float fanEdge = smoothstep(0.0, 0.10, sp) * smoothstep(1.0, 0.90, sp);
  float fanFalloff = exp(-(along - R) * 2.2);
  col += spectrum(sp) * inFan * fanEdge * fanFalloff * 0.75;

  col += vec3(1.0) * exp(-length(dvec + R * bdir) * 45.0) * 0.9;
  col += vec3(1.0) * exp(-length(dvec - R * bdir) * 45.0) * 0.5;

  col += vec3(0.10, 0.12, 0.22) * fbm(uv * 3.0 + t * 0.02) * 0.35;

  col *= 0.97 + 0.03 * sin(gl_FragCoord.y * 1.35);
  col += (hash(gl_FragCoord.xy + fract(t) * 100.0) - 0.5) * 0.035;

  float vig = 1.0 - 0.35 * smoothstep(0.4, 1.1, length((uv - 0.5) * vec2(aspect, 1.0)));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`

export function createMoonScene(
  canvas: HTMLCanvasElement,
  opts: MoonSceneOptions
): MoonScene | null {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false })
  if (!gl) return null

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("moon-scene shader:", gl.getShaderInfoLog(s))
      gl.deleteShader(s)
      return null
    }
    return s
  }

  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null

  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)

  // 全屏三角形
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, "aPos")
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const uRes = gl.getUniformLocation(prog, "uRes")
  const uTime = gl.getUniformLocation(prog, "uTime")
  const uMoon = gl.getUniformLocation(prog, "uMoon")
  const uR = gl.getUniformLocation(prog, "uR")
  const uText = gl.getUniformLocation(prog, "uText")

  // ---- 文字纹理：把标题画到 2D canvas 再上传 ----
  const tex = gl.createTexture()
  const font = opts.font ?? '700 300px "Orbitron", "Microsoft YaHei", sans-serif'
  const buildTextTexture = () => {
    const tc = document.createElement("canvas")
    tc.width = 2048
    tc.height = 512
    const c2 = tc.getContext("2d")
    if (!c2) return
    c2.fillStyle = "#000"
    c2.fillRect(0, 0, tc.width, tc.height)
    c2.fillStyle = "#fff"
    c2.font = font
    c2.textAlign = "center"
    c2.textBaseline = "middle"
    c2.fillText(opts.text, tc.width / 2, tc.height / 2 + 10)

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, tc)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }
  buildTextTexture()
  if (document.fonts?.ready) document.fonts.ready.then(buildTextTexture).catch(() => {})
  gl.uniform1i(uText, 0)

  // ---- 尺寸 ----
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    if (!w || !h) return
    const pw = Math.round(w * dpr)
    const ph = Math.round(h * dpr)
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw
      canvas.height = ph
      gl.viewport(0, 0, pw, ph)
    }
  }
  resize()

  /* 画布自身尺寸变化即重设 backing store（侧边栏收起、分栏动画等
     容器布局变化不会触发 window.resize，靠 RO 观察元素本身） */
  const ro =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
  ro?.observe(canvas)

  // ---- 月亮：基准点（+ 可选鼠标牵引，平滑跟随）----
  const base = opts.base ?? { x: 0.44, y: 0.5 }
  let moonX = base.x
  let moonY = base.y
  let moonR = 0.13
  let targetX = base.x
  let targetY = base.y
  const parallax = opts.parallax ?? false

  const onMouseMove = (e: MouseEvent) => {
    const nx = e.clientX / window.innerWidth
    const ny = e.clientY / window.innerHeight
    targetX = base.x + (nx - 0.5) * 0.16
    targetY = base.y - (ny - 0.5) * 0.16
  }
  if (parallax && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener("mousemove", onMouseMove)
  }

  // ---- 渲染循环（离屏/零尺寸时暂停）----
  let raf = 0
  let paused = false
  let disposed = false
  const t0 = performance.now()

  const frame = (now: number) => {
    raf = 0
    if (disposed) return
    if (!canvas.width || !canvas.height) {
      // 零尺寸（display:none 的树）空转等待，避免向 0 尺寸视口绘制
      raf = requestAnimationFrame(frame)
      return
    }
    const t = (now - t0) / 1000
    if (parallax) {
      moonX += (targetX - moonX) * 0.045
      moonY += (targetY - moonY) * 0.045
    }
    gl.uniform2f(uRes, canvas.width, canvas.height)
    gl.uniform1f(uTime, t)
    gl.uniform2f(uMoon, moonX, moonY)
    gl.uniform1f(uR, moonR)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    raf = requestAnimationFrame(frame)
  }
  const kick = () => {
    if (!raf && !disposed && !paused) raf = requestAnimationFrame(frame)
  }
  kick() // 启动渲染循环（hero 由 IO 再做暂停/恢复）

  return {
    setMoon(x, y, r) {
      moonX = x
      moonY = y
      targetX = x
      targetY = y
      if (r != null) moonR = r
    },
    setPaused(v) {
      paused = v
      if (v) {
        if (raf) cancelAnimationFrame(raf)
        raf = 0
      } else {
        kick()
      }
    },
    resize,
    dispose() {
      disposed = true
      ro?.disconnect()
      window.removeEventListener("mousemove", onMouseMove)
      if (raf) cancelAnimationFrame(raf)
      /* 不调用 loseContext：React StrictMode 双挂载会复用同一 canvas 的
         同一上下文，先丢再取会拿到 lost context（编译静默失败）。
         上下文随 canvas 元素本身回收。 */
    },
  }
}
