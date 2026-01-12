
document.querySelector("div.layout-background").appendChild((() => {

    const COLOR_PARTICLE = 0X484848
    const COLOR_FOREGROUND = 0X202020
    const COLOR_BACKGROUND = 0X000000
    const PARTICLE_COUNT = 250
    const FRAME_TIME = 1000 / 15

    let scene, camera, renderer
    let plane, planeMat, planeGeo
    let particles, particleGeo, particleMat, particleData = []
    let lastTime = 0, lastFrame = 0, time = 0

    function init() {
        // Create Scene
        const ratio = (window.innerWidth / window.innerHeight)
        scene = new THREE.Scene()
        scene.fog = new THREE.Fog(COLOR_BACKGROUND, 6, 24)

        camera = new THREE.PerspectiveCamera(70, ratio, 0.1, 100)
        camera.rotation.x = THREE.MathUtils.degToRad(-33.75)
        camera.position.set(0, 7.5, 15)
        camera.updateProjectionMatrix()

        if (!renderer) {
            renderer = new THREE.WebGLRenderer({ antialias: true })
        }
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setPixelRatio(Math.max(ratio / 8, .25))
        renderer.setClearColor(COLOR_BACKGROUND)

        // Create Plane
        let scale = 24, segments = 12
        planeMat = new THREE.MeshBasicMaterial({
            color: COLOR_FOREGROUND,
            wireframe: true,
        })
        planeGeo = new THREE.PlaneGeometry(
            scale * ratio, scale,
            segments * ratio, segments
        )
        planeGeo.userData.originalPositions = planeGeo.attributes.position.array.slice()

        plane = new THREE.Mesh(planeGeo, planeMat)
        plane.rotation.x = THREE.MathUtils.degToRad(-90)
        scene.add(plane)

        // Create Particles
        particleGeo = new THREE.BufferGeometry()
        const positions = new Float32Array(PARTICLE_COUNT * 3)
        const colors = new Float32Array(PARTICLE_COUNT * 4)

        particleData = []
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            spawnParticle(i, positions, colors)
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 4))

        particleMat = new THREE.PointsMaterial({
            size: .25,
            vertexColors: true,
            transparent: true,
            depthWrite: false
        })
        particles = new THREE.Points(particleGeo, particleMat)
        scene.add(particles)
    }

    // Functions
    function spawnParticle(i, positions, colors) {
        const halfW = (planeGeo.parameters.width) * 1
        const halfH = (planeGeo.parameters.height) * 1
        const x = THREE.MathUtils.randFloat(-halfW, halfW)
        const z = THREE.MathUtils.randFloat(-halfH, halfH)

        particleData[i] = {
            pos: new THREE.Vector3(x, 0, z),
            velocity: new THREE.Vector3(
                THREE.MathUtils.randFloatSpread(0.05), // tiny sideways drift
                THREE.MathUtils.randFloat(0.02, 0.05), // always upward
                THREE.MathUtils.randFloatSpread(0.05)
            ),
            life: THREE.MathUtils.randFloat(3.0, 6.0),
            maxLife: 0
        }
        particleData[i].maxLife = particleData[i].life

        const pidx = i * 3
        positions[pidx + 0] = x
        positions[pidx + 1] = 0
        positions[pidx + 2] = z

        const cidx = i * 4
        colors[cidx + 0] = ((COLOR_PARTICLE >> 0) & 0xFF) / 255
        colors[cidx + 1] = ((COLOR_PARTICLE >> 8) & 0xFF) / 255
        colors[cidx + 2] = ((COLOR_PARTICLE >> 16) & 0xFF) / 255
        colors[cidx + 3] = 0
    }

    function updateParticles(delta) {
        const positions = particleGeo.attributes.position.array
        const colors = particleGeo.attributes.color.array

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const p = particleData[i]
            const pidx = i * 3
            const cidx = i * 4

            // Lifetime
            p.life -= delta
            if (p.life <= 0) {
                spawnParticle(i, positions, colors)
                continue
            }
            const t = p.life / p.maxLife
            colors[cidx + 3] = Math.min(t * 1.2, 1)

            // Movement
            p.pos.addScaledVector(p.velocity, delta * 20)
            positions[pidx] = p.pos.x
            positions[pidx + 1] = p.pos.y
            positions[pidx + 2] = p.pos.z
        }

        particleGeo.attributes.position.needsUpdate = true
        particleGeo.attributes.color.needsUpdate = true
    }

    function updatePlane(delta) {
        const positions = planeGeo.attributes.position.array
        const original = planeGeo.userData.originalPositions
        for (let i = 0; i < positions.length; i += 3) {
            const x = original[i]
            const z = original[i + 1]
            const dist = Math.sqrt(x * x + z * z)
            const wave = Math.sin(dist * 0.5 - time)
            const cave = -Math.exp(-dist * 0.1) * 3.5

            positions[i] = x
            positions[i + 1] = z
            positions[i + 2] = wave + cave
        }
        planeGeo.attributes.position.needsUpdate = true
    }

    function animate(now) {
        requestAnimationFrame(animate)
        if (now - lastFrame < FRAME_TIME) return
        const delta = (now - lastTime) * 0.00025 || 0
        lastFrame = now
        lastTime = now
        time += delta
        updatePlane(delta)
        updateParticles(delta)
        renderer.render(scene, camera)
    }

    // Disabled on very small screens for performance reasons,
    // and because phone screens are too small! Wasting energy!
    if (window.outerWidth >= 1024) {
        window.addEventListener('resize', init)
        animate(0)
    }
    init()

    return renderer.domElement
})())