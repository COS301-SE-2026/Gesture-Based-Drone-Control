import * as THREE from "three"

export type DroneRig = {
  group: THREE.Group
  props: THREE.Group[]
  dispose: () => void
}

export function createDrone(
  frameColor: number,
  accentColor: number,
  scale = 1
): DroneRig {
  const geos: THREE.BufferGeometry[] = []
  const mats: THREE.Material[] = []

  const frame = new THREE.MeshBasicMaterial({
    color: frameColor,
    wireframe: true,
    transparent: true,
    opacity: 0.92,
  })

  const accent = new THREE.MeshBasicMaterial({
    color: accentColor,
    wireframe: true,
  })
  mats.push(frame, accent)

  const group = new THREE.Group()

  const bodyGeo = new THREE.BoxGeometry(1.35, 0.42, 1.35, 2, 1, 2)
  const canopyGeo = new THREE.BoxGeometry(0.6, 0.28, 0.9)
  const armGeo = new THREE.BoxGeometry(3.0, 0.1, 0.12)
  const rotorGeo = new THREE.TorusGeometry(0.52, 0.035, 6, 26)
  const bladeGeo = new THREE.BoxGeometry(0.95, 0.015, 0.07)
  const legGeo = new THREE.BoxGeometry(0.06, 0.5, 0.06)
  geos.push(bodyGeo, canopyGeo, armGeo, rotorGeo, bladeGeo, legGeo)

  group.add(new THREE.Mesh(bodyGeo, frame))

  const canopy = new THREE.Mesh(canopyGeo, accent)
  canopy.position.y = 0.32
  group.add(canopy)

  const armA = new THREE.Mesh(armGeo, frame)
  armA.rotation.y = Math.PI / 4
  const armB = new THREE.Mesh(armGeo, frame)
  armB.rotation.y = -Math.PI / 4
  group.add(armA, armB)

  const props: THREE.Group[] = []
  const d = 1.06
  const mounts: [number, number][] = [
    [d, d],
    [d, -d],
    [-d, d],
    [-d, -d],
  ]

  mounts.forEach(([px, pz]) => {
    const ring = new THREE.Mesh(rotorGeo, accent)
    ring.rotation.x = Math.PI / 2
    ring.position.set(px, 0.22, pz)
    group.add(ring)

    const prop = new THREE.Group()
    const b1 = new THREE.Mesh(bladeGeo, frame)
    const b2 = new THREE.Mesh(bladeGeo, frame)
    b2.rotation.y = Math.PI / 2
    prop.add(b1, b2)
    prop.position.set(px, 0.24, pz)
    group.add(prop)
    props.push(prop)
  })

  const legs: [number, number] = [-0.45, 0.45]
  legs.forEach((lx) => {
    const leg = new THREE.Mesh(legGeo, frame)
    leg.position.set(lx, -0.42, 0)
    group.add(leg)
  })

  group.scale.setScalar(scale)

  return {
    group,
    props,
    dispose: () => {
      geos.forEach((g) => g.dispose())
      mats.forEach((m) => m.dispose())
    },
  }
}

export default createDrone
