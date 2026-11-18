/**
 * 《太空非伊甸》专属开篇 WebGL 场景：
 * 全屏深空 FBM 星尘 + 折射液化字体纹理 + 潮汐锁定日食环 + 棱镜色散光束。
 * 由 SpaceNoEdenCurtain 逐帧驱动 uProgress / uEclipse / uEnergy。
 */

export interface NoEdenShaderScene {
  setState(params: {
    moonX: number
    moonY: number
    moonR: number
    eclipse: number
    energy: number
  }): void
  resize(): void
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
uniform float uEclipse;
uniform float uEnergy;
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
    p = p * 2.04 + 13.3;
    a *= 0.5;
  }
  return v;
}

float textAt(vec2 tp) {
  vec2 st = vec2(fract(tp.x), clamp(tp.y, 0.001, 0.999));
  return texture2D(uText, st).r;
}

vec3 spectrum(float x) {
  float r = smoothstep(0.55, 0.25, x) + 0.35 * smoothstep(0.80, 1.0, x);
  float g = smoothstep(0.10, 0.45, x) * smoothstep(0.85, 0.58, x);
  float b = smoothstep(0.40, 0.82, x);
  return vec3(r * 0.85, g * 0.98, b * 1.15);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime;

  // 折射液化背景文字纹理（太空非伊甸 / NO EDEN）
  float fit = max(1.0, 0.85 / aspect);
  vec2 tp;
  tp.x = uv.x * aspect * 0.92 * fit + t * 0.016;
  tp.y = (uv.y - 0.5) * 2.9 * fit + 0.5;

  vec2 warp = vec2(
    fbm(uv * 2.8 + vec2(t * 0.11, 0.0)),
    fbm(uv * 2.8 + vec2(4.1, -t * 0.09))
  ) - 0.5;
  tp += warp * 0.085;
  tp.y += sin(tp.x * 8.0 + t * 1.2) * 0.007;

  vec2 m = uMoon;
  vec2 dvec = (uv - m) * vec2(aspect, 1.0);
  float d = length(dvec);
  float R = uR;

  // 月球引力透镜折射
  float inside = smoothstep(R, R * 0.80, d);
  vec2 mTP = vec2(m.x * aspect * 0.92 * fit + t * 0.016, (m.y - 0.5) * 2.9 * fit + 0.5);
  vec2 tpLens = mTP + (tp - mTP) * 0.48;
  tp = mix(tp, tpLens, inside * 0.88);

  float smear = 0.005 + 0.009 * fbm(uv * 3.2 + t * 0.06);
  float m0 = textAt(tp);
  float mL = textAt(tp + vec2(smear, 0.0));
  float mR = textAt(tp - vec2(smear, 0.0));
  float mask = (m0 * 2.0 + mL + mR) * 0.25;

  vec2 ca = (d > 0.0001) ? (dvec / d) : vec2(0.0);
  float caStr = 0.001 + 0.004 * exp(-d * 3.2);
  vec3 textCol = vec3(
    textAt(tp + ca * caStr) * 0.55 + mask * 0.45,
    mask,
    textAt(tp - ca * caStr) * 0.65 + mask * 0.45
  );
  textCol *= 0.78 + 0.22 * sin(gl_FragCoord.y * 2.0);

  // 背景星云 + 文字微光
  vec3 col = vec3(0.008, 0.014, 0.032);
  float neb = fbm(uv * 3.2 + vec2(t * 0.025, -t * 0.015));
  col += vec3(0.05, 0.14, 0.24) * neb * (0.55 + uEnergy * 0.45);
  col += vec3(0.11, 0.06, 0.22) * fbm(uv * 2.1 - t * 0.02) * (1.0 - uEclipse * 0.4);

  float glowNear = exp(-d * 2.4);
  col += textCol * vec3(0.55, 0.88, 1.0) * (0.42 + 0.65 * glowNear);

  // 月盘主体：随着 uEclipse 从 0 -> 1 吞没原本银辉，归于通体皆暗
  col *= 1.0 - inside * 0.92;
  float litMask = 1.0 - smoothstep(0.15, 0.92, uEclipse);
  float crescent = smoothstep(-0.2, 0.85, dot(dvec / max(d, 1e-4), normalize(vec2(0.8, -0.5))));
  col += vec3(0.75, 0.86, 1.0) * inside * crescent * litMask * 0.22;

  // 终章日食外冕（uEclipse 越大越耀眼，随 uEnergy 呼吸）
  float rim = smoothstep(0.008, 0.0, abs(d - R));
  float corona = exp(-max(d - R, 0.0) * (8.5 - uEclipse * 3.5));
  vec3 coronaCol = mix(vec3(0.38, 0.72, 1.0), vec3(0.15, 0.92, 0.98), uEclipse);
  col += coronaCol * rim * (0.35 + uEclipse * 0.95 + uEnergy * 0.45);
  col += coronaCol * corona * (0.12 + uEclipse * 0.45 + uEnergy * 0.28);

  // 钻石环闪点（右上边缘）
  vec2 ringDir = normalize(vec2(0.72, 0.68));
  float diamond = exp(-length(dvec - R * ringDir) * 32.0) * smoothstep(0.45, 1.0, uEclipse);
  col += vec3(0.85, 0.98, 1.0) * diamond * (1.1 + uEnergy * 0.5);

  // 穿透光束 + 棱镜色散扇形（对应"借光者在黑暗中划出的轨迹"）
  vec2 S = (vec2(-0.08, 0.62) - m) * vec2(aspect, 1.0);
  float srcDist = length(S);
  vec2 bdir = normalize(-S);
  float along = dot(dvec, bdir);
  float perp = dot(dvec, vec2(-bdir.y, bdir.x));

  float beamCore = smoothstep(0.004, 0.0, abs(perp));
  float beamGlow = smoothstep(0.032, 0.0, abs(perp));
  float beamSeg = smoothstep(-srcDist, -srcDist + 0.06, along)
                * (1.0 - smoothstep(-R - 0.01, -R + 0.01, along));
  col += vec3(0.75, 0.95, 1.0) * (beamCore * 0.65 + beamGlow * 0.22) * beamSeg;

  float dev = atan(perp, max(along, 1e-4));
  float sp = (dev - 0.04) / (0.22 - 0.04);
  float inFan = step(0.0, sp) * step(sp, 1.0) * step(R, along);
  float fanEdge = smoothstep(0.0, 0.12, sp) * smoothstep(1.0, 0.88, sp);
  float fanFalloff = exp(-(along - R) * 2.0);
  col += spectrum(sp) * inFan * fanEdge * fanFalloff * (0.65 + uEnergy * 0.35);

  // 细微扫描线 + 暗角
  col *= 0.96 + 0.04 * sin(gl_FragCoord.y * 1.4);
  col += (hash(gl_FragCoord.xy + fract(t) * 100.0) - 0.5) * 0.03;
  float vig = 1.0 - 0.42 * smoothstep(0.42, 1.15, length((uv - 0.5) * vec2(aspect, 1.0)));
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`

export function createNoEdenShaderScene(
  canvas: HTMLCanvasElement
): NoEdenShaderScene | null {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false })
  if (!gl) return null

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
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

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  )
  const aPos = gl.getAttribLocation(prog, "aPos")
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const uRes = gl.getUniformLocation(prog, "uRes")
  const uTime = gl.getUniformLocation(prog, "uTime")
  const uMoon = gl.getUniformLocation(prog, "uMoon")
  const uR = gl.getUniformLocation(prog, "uR")
  const uEclipse = gl.getUniformLocation(prog, "uEclipse")
  const uEnergy = gl.getUniformLocation(prog, "uEnergy")
  const uText = gl.getUniformLocation(prog, "uText")

  const tex = gl.createTexture()
  const buildTex = () => {
    const tc = document.createElement("canvas")
    tc.width = 2048
    tc.height = 512
    const c2 = tc.getContext("2d")
    if (!c2) return
    c2.fillStyle = "#000"
    c2.fillRect(0, 0, tc.width, tc.height)
    c2.fillStyle = "#fff"
    c2.font = '700 210px "Segoe UI", "Microsoft YaHei", sans-serif'
    c2.textAlign = "center"
    c2.textBaseline = "middle"
    c2.fillText("NO EDEN // 太空非伊甸", tc.width / 2, tc.height / 2)

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      tc
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }
  buildTex()
  gl.uniform1i(uText, 0)

  let moonX = 0.5
  let moonY = 0.5
  let moonR = 0.16
  let eclipse = 0.2
  let energy = 0.15
  let disposed = false
  let raf = 0
  let t0: number | null = null

  const render = (t: number) => {
    if (!canvas.width || !canvas.height) return
    gl.uniform2f(uRes, canvas.width, canvas.height)
    gl.uniform1f(uTime, t)
    gl.uniform2f(uMoon, moonX, moonY)
    gl.uniform1f(uR, moonR)
    gl.uniform1f(uEclipse, eclipse)
    gl.uniform1f(uEnergy, energy)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
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

  const ro =
    typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
  ro?.observe(canvas)

  const loop = (now: number) => {
    if (disposed) return
    if (t0 === null) t0 = now
    render(Math.max(0, (now - t0) / 1000))
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return {
    setState(params) {
      moonX = params.moonX
      moonY = params.moonY
      moonR = params.moonR
      eclipse = params.eclipse
      energy = params.energy
    },
    resize,
    dispose() {
      disposed = true
      ro?.disconnect()
      if (raf) cancelAnimationFrame(raf)
    },
  }
}
