import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import useTheme from "../../hooks/useTheme"
import "./DroneScene.css"

//wireframe drone that chases cursor, with hud telemetry
export default function DroneScene() {
  const { theme } = useTheme()
  const mountRef = useRef<HTMLDivElement | null>(null)
  const frameMat = useRef<THREE.MeshBasicMaterial | null>(null)
  const redMat = useRef<THREE.MeshBasicMaterial | null>(null)
  const dotMat = useRef<THREE.PointsMaterial | null>(null)
  const [telemetry, setTelemetry] = useState({ alt: "1.60", vel: "0.00" })

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    )
    camera.position.set(0, 1.1, 6.4)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const fMat = new THREE.MeshBasicMaterial({
      wireframe: true,
      transparent: true,
      opacity: 0.9,
    })
    const rMat = new THREE.MeshBasicMaterial({ wireframe: true })
    frameMat.current = fMat
    redMat.current = rMat

    // drone from primitives
    const drone = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.42, 1.35, 2, 1, 2),
      fMat
    )
    drone.add(body)
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.28, 0.9, 1, 1, 1),
      rMat
    )
    canopy.position.y = 0.32
    drone.add(canopy)

    const armA = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 0.12), fMat)
    armA.rotation.y = Math.PI / 4
    const armB = armA.clone()
    armB.rotation.y = -Math.PI / 4
    drone.add(armA, armB)

    const props: THREE.Group[] = []
    const rotorGeo = new THREE.TorusGeometry(0.52, 0.035, 6, 26)
    const bladeGeo = new THREE.BoxGeometry(0.95, 0.015, 0.07)
    const d = 1.06
    ;(
      [
        [d, d],
        [d, -d],
        [-d, d],
        [-d, -d],
      ] as [number, number][]
    ).forEach(([px, pz]) => {
      const ring = new THREE.Mesh(rotorGeo, rMat)
      ring.rotation.x = Math.PI / 2
      ring.position.set(px, 0.22, pz)
      drone.add(ring)
      const prop = new THREE.Group()
      const b1 = new THREE.Mesh(bladeGeo, fMat)
      const b2 = b1.clone()
      b2.rotation.y = Math.PI / 2
      prop.add(b1, b2)
      prop.position.set(px, 0.24, pz)
      drone.add(prop)
      props.push(prop)
    })
    const legGeo = new THREE.BoxGeometry(0.06, 0.5, 0.06)
    ;[-0.45, 0.45].forEach((lx) => {
      const leg = new THREE.Mesh(legGeo, fMat)
      leg.position.set(lx, -0.42, 0)
      drone.add(leg)
    })
    drone.scale.setScalar(0.9)
    scene.add(drone)

    // dust field
    const count = 260
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18
      pos[i * 3 + 1] = (Math.random() - 0.5) * 9
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1
    }
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    const dMat = new THREE.PointsMaterial({
      size: 0.035,
      transparent: true,
      opacity: 0.7,
    })
    dotMat.current = dMat
    const dust = new THREE.Points(dustGeo, dMat)
    scene.add(dust)

    // cursor = gesture
    const target = new THREE.Vector3(0, 0.4, 0)
    const onMove = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect()
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1
      const ny = -(((e.clientY - r.top) / r.height) * 2 - 1)
      target.set(nx * 3.1, ny * 1.55 + 0.35, 0)
    }
    window.addEventListener("mousemove", onMove)

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener("resize", onResize)

    let raf = 0
    let t = 0
    const vel = new THREE.Vector3()
    const tick = () => {
      t += 0.016
      const prev = drone.position.clone()
      drone.position.lerp(target, 0.045)
      drone.position.y += Math.sin(t * 1.7) * 0.0035
      vel.subVectors(drone.position, prev)
      drone.rotation.z = THREE.MathUtils.lerp(
        drone.rotation.z,
        -vel.x * 6,
        0.12
      )
      drone.rotation.x = THREE.MathUtils.lerp(drone.rotation.x, vel.y * 4, 0.12)
      drone.rotation.y += 0.0018
      props.forEach((pr, i) => (pr.rotation.y += 0.55 + i * 0.03))
      dust.rotation.y += 0.0004
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }

    if (reduced) {
      renderer.render(scene, camera)
    } else {
      raf = requestAnimationFrame(tick)
    }

    const hud = window.setInterval(() => {
      setTelemetry({
        alt: (1.6 + drone.position.y).toFixed(2),
        vel: (vel.length() * 60).toFixed(2),
      })
    }, 180)

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(hud)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
      if (renderer.domElement.parentNode === mount)
        mount.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    const dark = theme === "dark"
    frameMat.current?.color.set(dark ? 0xd3d3d3 : 0x161a1d)
    redMat.current?.color.set(dark ? 0xe5383b : 0xba181b)
    dotMat.current?.color.set(dark ? 0x660708 : 0xb1a7a6)
  }, [theme])

  return (
    <div className="md-scene" ref={mountRef} aria-hidden="true">
      <div className="md-telemetry" aria-hidden="true">
        <span>ALT&nbsp;&nbsp;{telemetry.alt} M</span>
        <span>VEL&nbsp;&nbsp;{telemetry.vel} M/S</span>
        <span>
          <i className="md-dot" /> LINK STABLE
        </span>
        <span>GESTURE&nbsp;&nbsp;TRACKING</span>
      </div>
    </div>
  )
}
