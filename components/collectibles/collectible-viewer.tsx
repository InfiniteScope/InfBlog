"use client"

import { Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from "react"
import * as THREE from "three"
import { Canvas } from "@react-three/fiber"
import {
  ContactShadows,
  Environment,
  Float,
  OrbitControls,
  RoundedBox,
  useGLTF,
} from "@react-three/drei"
import { useReducedMotion } from "motion/react"

import type { CollectibleId } from "@/lib/collectibles"

/* ─────────────── 资产加载（pmndrs/market-assets，CC0 低多边形） ───────────────
   banana.gltf 4KB / turntable.gltf 4.1MB / headphones.gltf 273KB
   内嵌 base64，无外部纹理依赖。useGLTF 自带缓存；不在此处 preload——
   preload 会在模块加载期立即拉取模型（SSR 同样执行），改由渲染时懒加载。 */

/** 目标显示尺寸：所有藏品统一归一化到该包围盒最大边（世界单位） */
const TARGET_SIZE = 2.2

/**
 * 将任意 Object3D 缩放至 targetExtent 大小，并将包围盒几何中心置于原点。
 * (解决：不同资产尺度差异大 + 旋转中心不在模型中心)
 */
function fitToCenter(src: THREE.Object3D, targetExtent: number) {
  const clone = src.clone(true)
  const holder = new THREE.Group()
  holder.add(clone)
  holder.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(holder)
  const size = box.getSize(new THREE.Vector3())
  const extent = Math.max(size.x, size.y, size.z) || 1
  const s = targetExtent / extent
  const center = box.getCenter(new THREE.Vector3())

  holder.scale.setScalar(s)
  holder.position.set(-center.x * s, -center.y * s, -center.z * s)
  return { object: holder, height: size.y * s }
}

/**
 * 包一层：测量子节点包围盒 → 归一化缩放 + 几何中心置原点。
 * 程序化模型（JSX children）用它；gltf 模型在组件内部用 fitToCenter。
 */
function AutoCenter({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)

  useLayoutEffect(() => {
    const g = ref.current
    if (!g) return
    g.position.set(0, 0, 0)
    g.scale.setScalar(1)
    g.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(g)
    const size = box.getSize(new THREE.Vector3())
    const extent = Math.max(size.x, size.y, size.z) || 1
    const s = TARGET_SIZE / extent
    const center = box.getCenter(new THREE.Vector3())
    g.scale.setScalar(s)
    g.position.set(-center.x * s, -center.y * s, -center.z * s)
  }, [])

  return <group ref={ref}>{children}</group>
}

/** Banana：pmndrs 现成低多边形香蕉（fitToCenter 归一化） */
function BananaModel({ gold = false }: { gold?: boolean }) {
  const { scene: baseScene } = useGLTF("/models/banana.gltf")
  const { object } = useMemo(() => {
    const clone = baseScene.clone(true)
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const m = child.material as THREE.MeshStandardMaterial
        if (gold) {
          m.color = new THREE.Color("#ffd700")
          m.metalness = 1
          m.roughness = 0.22
          m.emissive = new THREE.Color("#7a5a00")
          m.emissiveIntensity = 0.45
          m.envMapIntensity = 1.8
        } else {
          // 普通香蕉：黯淡一点（原材质偏光/偏金属）
          m.metalness = 0.05
          m.roughness = 0.72
          m.envMapIntensity = 0.4
        }
      }
    })
    return fitToCenter(clone, TARGET_SIZE)
  }, [baseScene, gold])

  return <primitive object={object} />
}

/** Trophy：Lathe 旋转成杯体 + 双耳环 + 底座（库无现成 → 程序化 PBR） */
function Trophy() {
  const profile = useMemo(() => {
    const pts: THREE.Vector2[] = []
    const P: [number, number][] = [
      [0.0, 0], [1.1, 0], [1.1, 0.22], [0.9, 0.24], [0.9, 0.4], // pedestal
      [0.38, 0.52], [0.3, 0.62], [0.3, 1.05], // column
      [0.62, 1.18], [0.95, 1.32], [0.98, 1.55], [0.86, 1.62], [0.7, 1.62], // bowl
      [0.62, 1.5], [0.62, 1.42], [0.3, 1.35], [0.3, 1.05],
    ]
    for (const [x, y] of P) pts.push(new THREE.Vector2(x, y))
    return pts
  }, [])
  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d4a017",
        metalness: 1,
        roughness: 0.25,
        envMapIntensity: 1.6,
      }),
    []
  )
  return (
    <group>
      <mesh material={goldMat}>
        <latheGeometry args={[profile, 64]} />
      </mesh>
      <mesh position={[-0.95, 1.42, 0]} rotation={[0, 0, 0.35]} material={goldMat}>
        <torusGeometry args={[0.28, 0.06, 16, 48]} />
      </mesh>
      <mesh position={[0.95, 1.42, 0]} rotation={[0, 0, -0.35]} material={goldMat}>
        <torusGeometry args={[0.28, 0.06, 16, 48]} />
      </mesh>
    </group>
  )
}

/** Listener：pmndrs 黑胶唱机 + 悬浮 pmndrs 耳机，按比例 fit 后组合 */
function RecordPlayer() {
  const turntable = useGLTF("/models/turntable.gltf")
  const headphones = useGLTF("/models/headphones.gltf")

  const turntableFit = useMemo(
    () => fitToCenter(turntable.scene, 1.9),
    [turntable.scene]
  )
  const headphonesFit = useMemo(
    () => fitToCenter(headphones.scene, 0.62),
    [headphones.scene]
  )

  const ttHalf = turntableFit.height / 2
  const hpHalf = headphonesFit.height / 2
  const hpY = ttHalf + 0.38 + hpHalf

  return (
    <group>
      <primitive object={turntableFit.object} />
      <Float
        speed={2}
        rotationIntensity={0.25}
        floatIntensity={0.5}
        floatingRange={[0.05, 0.26]}
      >
        <group position={[0, hpY, 0]}>
          <primitive object={headphonesFit.object} />
        </group>
      </Float>
    </group>
  )
}

/** Reader：打开的书 + 眼镜（库无现成 → 程序化 PBR） */
function OpenBook() {
  const paper = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#f3ecd8", roughness: 0.9 }),
    []
  )
  const ink = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#c9bea6", roughness: 1 }),
    []
  )
  const frame = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1c1c20",
        roughness: 0.35,
        metalness: 0.3,
      }),
    []
  )
  const lens = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#a5c9dd",
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.55,
      }),
    []
  )
  return (
    <group>
      <RoundedBox args={[3.2, 0.16, 2.2]} radius={0.03} smoothness={3} position={[0, 0, 0]}>
        <meshStandardMaterial color="#8a5a33" roughness={0.6} />
      </RoundedBox>
      <RoundedBox
        args={[1.4, 0.1, 1.95]}
        radius={0.02}
        smoothness={2}
        position={[-0.85, 0.12, 0]}
        rotation={[0, 0, 0.06]}
        material={paper}
      />
      <RoundedBox
        args={[1.4, 0.1, 1.95]}
        radius={0.02}
        smoothness={2}
        position={[0.85, 0.12, 0]}
        rotation={[0, 0, -0.06]}
        material={paper}
      />
      {[0.3, 0.55, 0.8].map((z, i) => (
        <mesh
          key={i}
          position={[-0.85, 0.18, z - 0.6]}
          rotation={[0, 0, 0.06]}
          material={ink}
        >
          <boxGeometry args={[1.1, 0.012, 0.04]} />
        </mesh>
      ))}
      {[0.3, 0.55, 0.8].map((z, i) => (
        <mesh
          key={`r${i}`}
          position={[0.85, 0.18, z - 0.6]}
          rotation={[0, 0, -0.06]}
          material={ink}
        >
          <boxGeometry args={[1.1, 0.012, 0.04]} />
        </mesh>
      ))}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.06, 0.14, 2.0]} />
        <meshStandardMaterial color="#6d4426" roughness={0.7} />
      </mesh>
      <group position={[0, 0.24, 0]}>
        {[-0.34, 0.34].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={frame}>
            <torusGeometry args={[0.2, 0.028, 12, 40]} />
          </mesh>
        ))}
        <mesh material={frame}>
          <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        </mesh>
        {[-0.34, 0.34].map((x, i) => (
          <mesh key={`l${i}`} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={lens}>
            <circleGeometry args={[0.17, 32]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Model({ itemId }: { itemId: CollectibleId }) {
  switch (itemId) {
    case "banana":
      return <BananaModel />
    case "bubble-banana":
      return <BananaModel gold />
    case "sharing-hero":
      return <Trophy />
    case "listener":
      return <RecordPlayer />
    case "reader":
      return <OpenBook />
  }
}

/* ─────────────── 舞台（自动旋转 + 拖拽旋转 + 几何中心为旋转轴） ─────────────── */

interface CollectibleViewerProps {
  itemId: CollectibleId
  size?: number
}

export function CollectibleViewer({ itemId, size = 240 }: CollectibleViewerProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div style={{ width: size, height: size }} className="relative">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.2, 4.6], fov: 40 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        <hemisphereLight args={["#ffffff", "#3a3a44", 0.65]} />
        <directionalLight position={[5, 8, 6]} intensity={1.5} />
        <directionalLight position={[-5, 4, -6]} intensity={0.55} color="#bcd7ff" />
        <pointLight position={[0, 2, 4]} intensity={12} color="#fff2c4" distance={12} />

        <Environment preset="city" resolution={128} />

        {/* AutoCenter：模型几何中心在原点 → Float 旋转、OrbitControls 拖拽都围绕模型中心 */}
        <Suspense fallback={null}>
          <AutoCenter key={itemId}>
            <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.5}>
              <Model itemId={itemId} />
            </Float>
          </AutoCenter>
        </Suspense>

        <ContactShadows
          position={[0, -TARGET_SIZE / 2 - 0.02, 0]}
          opacity={0.4}
          scale={7}
          blur={2.4}
          far={3}
          resolution={256}
          color="#000000"
        />

        <OrbitControls
          makeDefault
          enabled
          enablePan={false}
          enableZoom={false}
          autoRotate={!prefersReducedMotion}
          autoRotateSpeed={3}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.1}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  )
}
