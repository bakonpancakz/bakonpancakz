document.querySelector("div.layout-background").appendChild((() => {

	const COLOR_PARTICLE = 0x363636
	const COLOR_FOREGROUND = 0x282828
	const COLOR_BACKGROUND = 0x000000
	const PARTICLE_COUNT = 320
	const FRAME_TIME = 1000 / 15

	let gl, canvas
	let planeProg, particleProg
	let planeBuf, planeIdxBuf, planeOrigBuf
	let particlePosBuf, particleColorBuf
	let planeVerts, planeOrig, planeIdx
	let particlePos, particleColor, particleData = []
	let lastTime = 0, lastFrame = 0, time = 0
	let planeW, planeH, planeSegX, planeSegY
	let uTimePlane, uMVPPlane, uFogColorPlane, uFogNearPlane, uFogFarPlane
	let uMVPParticle, uFogColorParticle, uFogNearParticle, uFogFarParticle

	// --- Math helpers ---
	function mat4() { return new Float32Array(16) }
	function mat4Identity(m) {
		m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 0;
		m[4] = 0; m[5] = 1; m[6] = 0; m[7] = 0;
		m[8] = 0; m[9] = 0; m[10] = 1; m[11] = 0;
		m[12] = 0; m[13] = 0; m[14] = 0; m[15] = 1;
		return m
	}
	function mat4Multiply(out, a, b) {
		for (let i = 0; i < 4; i++)
			for (let j = 0; j < 4; j++) {
				out[j * 4 + i] = 0
				for (let k = 0; k < 4; k++) out[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]
			}
		return out
	}
	function mat4Perspective(m, fovY, aspect, near, far) {
		const f = 1.0 / Math.tan(fovY / 2)
		m[0] = f / aspect; m[1] = 0; m[2] = 0; m[3] = 0
		m[4] = 0; m[5] = f; m[6] = 0; m[7] = 0
		m[8] = 0; m[9] = 0; m[10] = (far + near) / (near - far); m[11] = -1
		m[12] = 0; m[13] = 0; m[14] = (2 * far * near) / (near - far); m[15] = 0
		return m
	}
	function mat4RotateX(m, angle) {
		const c = Math.cos(angle), s = Math.sin(angle)
		const t = mat4Identity(mat4())
		t[5] = c; t[6] = s; t[9] = -s; t[10] = c
		return mat4Multiply(mat4(), t, m)
	}
	function mat4Translate(m, x, y, z) {
		const t = mat4Identity(mat4())
		t[12] = x; t[13] = y; t[14] = z
		return mat4Multiply(mat4(), t, m)
	}
	function randFloat(lo, hi) { return lo + Math.random() * (hi - lo) }
	function randFloatSpread(range) { return randFloat(-range / 2, range / 2) }
	function degToRad(d) { return d * Math.PI / 180 }
	function intToRGB(i) {
		return [
			((i >> 16) & 0xFF) / 255,
			((i >> 8) & 0xFF) / 255,
			((i >> 0) & 0xFF) / 255
		]
	}

	// --- Shader sources ---
	const PLANE_VERT = `
        attribute vec3 aPosition;
        uniform mat4 uMVP;
        uniform float uTime;
        varying float vDist;
        void main() {
            float dist = sqrt(aPosition.x*aPosition.x + aPosition.z*aPosition.z);
            float wave = sin(dist * 0.5 - uTime);
            float cave = -exp(-dist * 0.1) * 3.5;
            vec3 pos = vec3(aPosition.x, aPosition.y + wave + cave, aPosition.z);
            vDist = length((uMVP * vec4(pos, 1.0)).xyz);
            gl_Position = uMVP * vec4(pos, 1.0);
        }
    `
	const PLANE_FRAG = `
        precision mediump float;
        uniform vec3 uFogColor;
        uniform float uFogNear;
        uniform float uFogFar;
        varying float vDist;
        void main() {
            float fog = clamp((vDist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
            vec3 color = mix(vec3(${intToRGB(COLOR_FOREGROUND).join(',')}), uFogColor, fog);
            gl_FragColor = vec4(color, 1.0);
        }
    `
	const PARTICLE_VERT = `
        attribute vec3 aPosition;
        attribute vec4 aColor;
        uniform mat4 uMVP;
        varying vec4 vColor;
        varying float vDist;
        void main() {
            vec4 pos = uMVP * vec4(aPosition, 1.0);
            vDist = length(pos.xyz);
            vColor = aColor;
            gl_PointSize = 3.0;
            gl_Position = pos;
        }
    `
	const PARTICLE_FRAG = `
        precision mediump float;
        uniform vec3 uFogColor;
        uniform float uFogNear;
        uniform float uFogFar;
        varying vec4 vColor;
        varying float vDist;
        void main() {
            float fog = clamp((vDist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
            float alpha = vColor.a * (1.0 - fog);
            gl_FragColor = vec4(mix(vColor.rgb, uFogColor, fog), alpha);
        }
    `

	function compileShader(src, type) {
		const s = gl.createShader(type)
		gl.shaderSource(s, src)
		gl.compileShader(s)
		return s
	}
	function createProgram(vert, frag) {
		const p = gl.createProgram()
		gl.attachShader(p, compileShader(vert, gl.VERTEX_SHADER))
		gl.attachShader(p, compileShader(frag, gl.FRAGMENT_SHADER))
		gl.linkProgram(p)
		return p
	}

	function buildPlane(ratio) {
		const scale = 24
		planeSegX = Math.round(12 * ratio)
		planeSegY = 12
		planeW = scale * ratio
		planeH = scale

		const nx = planeSegX + 1, ny = planeSegY + 1
		planeVerts = new Float32Array(nx * ny * 3)
		planeOrig = new Float32Array(nx * ny * 3)

		let vi = 0
		for (let iy = 0; iy < ny; iy++) {
			for (let ix = 0; ix < nx; ix++) {
				const x = (ix / planeSegX - 0.5) * planeW
				const z = (iy / planeSegY - 0.5) * planeH
				planeVerts[vi] = x
				planeVerts[vi + 1] = 0
				planeVerts[vi + 2] = z
				planeOrig[vi] = x
				planeOrig[vi + 1] = 0
				planeOrig[vi + 2] = z
				vi += 3
			}
		}

		// Wireframe indices — two triangles per quad
		const lines = []
		for (let iy = 0; iy < ny; iy++) {
			for (let ix = 0; ix < nx; ix++) {
				const idx = iy * nx + ix
				if (ix < planeSegX) { lines.push(idx, idx + 1) }
				if (iy < planeSegY) { lines.push(idx, idx + nx) }
				if (ix < planeSegX && iy < planeSegY) { lines.push(idx, idx + nx + 1) }
			}
		}
		planeIdx = new Uint16Array(lines)
	}

	function spawnParticle(i) {
		const x = randFloat(-planeW, planeW)
		const z = randFloat(-planeH, planeH)
		particleData[i] = {
			x, y: 0, z,
			vx: randFloatSpread(0.05),
			vy: randFloat(0.02, 0.05),
			vz: randFloatSpread(0.05),
			life: randFloat(3.0, 6.0),
			maxLife: 0
		}
		particleData[i].maxLife = particleData[i].life
		const p = i * 3
		particlePos[p] = x; particlePos[p + 1] = 0; particlePos[p + 2] = z
		const c = i * 4
		const [r, g, b] = intToRGB(COLOR_PARTICLE)
		particleColor[c + 0] = r
		particleColor[c + 1] = g
		particleColor[c + 2] = b
		particleColor[c + 3] = 0
	}

	function init() {
		canvas.width = Math.floor(window.innerWidth * 0.25)
		canvas.height = Math.floor(window.innerHeight * 0.25)
		canvas.style.width = window.innerWidth + 'px'
		canvas.style.height = window.innerHeight + 'px'
		canvas.style.imageRendering = 'pixelated'

		const ratio = canvas.width / canvas.height

		gl.viewport(0, 0, canvas.width, canvas.height)
		gl.clearColor(...intToRGB(COLOR_BACKGROUND), 1)
		gl.enable(gl.BLEND)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

		buildPlane(ratio)

		// Upload plane buffers
		gl.bindBuffer(gl.ARRAY_BUFFER, planeBuf)
		gl.bufferData(gl.ARRAY_BUFFER, planeVerts, gl.DYNAMIC_DRAW)
		gl.bindBuffer(gl.ARRAY_BUFFER, planeOrigBuf)
		gl.bufferData(gl.ARRAY_BUFFER, planeOrig, gl.STATIC_DRAW)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planeIdxBuf)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, planeIdx, gl.STATIC_DRAW)

		// Init particles if first time
		if (particleData.length === 0) {
			particlePos = new Float32Array(PARTICLE_COUNT * 3)
			particleColor = new Float32Array(PARTICLE_COUNT * 4)
			for (let i = 0; i < PARTICLE_COUNT; i++) spawnParticle(i)
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, particlePosBuf)
		gl.bufferData(gl.ARRAY_BUFFER, particlePos, gl.DYNAMIC_DRAW)
		gl.bindBuffer(gl.ARRAY_BUFFER, particleColorBuf)
		gl.bufferData(gl.ARRAY_BUFFER, particleColor, gl.DYNAMIC_DRAW)

		// Build MVP
		const proj = mat4Perspective(mat4(), degToRad(70), ratio, 0.1, 100)
		let view = mat4Identity(mat4())
		view = mat4Translate(view, 0, -7.5, -15)
		view = mat4RotateX(view, degToRad(33.75))
		const mvp = mat4Multiply(mat4(), proj, view)

		gl.useProgram(planeProg)
		gl.uniformMatrix4fv(uMVPPlane, false, mvp)
		gl.uniform3f(uFogColorPlane, ...intToRGB(COLOR_BACKGROUND))
		gl.uniform1f(uFogNearPlane, 2)
		gl.uniform1f(uFogFarPlane, 22)

		gl.useProgram(particleProg)
		gl.uniformMatrix4fv(uMVPParticle, false, mvp)
		gl.uniform3f(uFogColorParticle, ...intToRGB(COLOR_BACKGROUND))
		gl.uniform1f(uFogNearParticle, 6)
		gl.uniform1f(uFogFarParticle, 22)
	}

	function updatePlane() {
		for (let i = 0; i < planeVerts.length; i += 3) {
			const x = planeOrig[i], z = planeOrig[i + 2]
			const dist = Math.sqrt(x * x + z * z)
			planeVerts[i] = x
			planeVerts[i + 1] = Math.sin(dist * 0.5 - time) * 0.5 + (-Math.exp(-dist * 0.1) * 3.5)
			planeVerts[i + 2] = z
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, planeBuf)
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, planeVerts)
	}

	function updateParticles(delta) {
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const p = particleData[i]
			p.life -= delta
			if (p.life <= 0) { spawnParticle(i); continue }
			const t = p.life / p.maxLife
			p.x += p.vx * delta * 20
			p.y += p.vy * delta * 20
			p.z += p.vz * delta * 20
			const pi = i * 3
			particlePos[pi] = p.x; particlePos[pi + 1] = p.y; particlePos[pi + 2] = p.z
			particleColor[i * 4 + 3] = Math.min(t * 1.2, 1)
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, particlePosBuf)
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, particlePos)
		gl.bindBuffer(gl.ARRAY_BUFFER, particleColorBuf)
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, particleColor)
	}

	function drawPlane() {
		gl.useProgram(planeProg)
		gl.uniform1f(uTimePlane, time)

		const aPos = gl.getAttribLocation(planeProg, 'aPosition')
		gl.bindBuffer(gl.ARRAY_BUFFER, planeBuf)
		gl.enableVertexAttribArray(aPos)
		gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planeIdxBuf)
		gl.drawElements(gl.LINES, planeIdx.length, gl.UNSIGNED_SHORT, 0)
	}

	function drawParticles() {
		gl.useProgram(particleProg)

		const aPos = gl.getAttribLocation(particleProg, 'aPosition')
		const aCol = gl.getAttribLocation(particleProg, 'aColor')

		gl.bindBuffer(gl.ARRAY_BUFFER, particlePosBuf)
		gl.enableVertexAttribArray(aPos)
		gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)

		gl.bindBuffer(gl.ARRAY_BUFFER, particleColorBuf)
		gl.enableVertexAttribArray(aCol)
		gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, 0, 0)

		gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT)
	}

	function animate(now) {
		requestAnimationFrame(animate)
		if (now - lastFrame < FRAME_TIME) return
		const delta = (now - lastTime) * 0.00008 || 0
		lastFrame = now; lastTime = now; time += delta
		gl.clear(gl.COLOR_BUFFER_BIT)
		updatePlane()
		updateParticles(delta)
		drawPlane()
		drawParticles()
	}

	// --- Bootstrap ---
	canvas = document.createElement('canvas')
	gl = canvas.getContext('webgl')

	planeProg = createProgram(PLANE_VERT, PLANE_FRAG)
	particleProg = createProgram(PARTICLE_VERT, PARTICLE_FRAG)

	planeBuf = gl.createBuffer()
	planeOrigBuf = gl.createBuffer()
	planeIdxBuf = gl.createBuffer()
	particlePosBuf = gl.createBuffer()
	particleColorBuf = gl.createBuffer()

	uTimePlane = gl.getUniformLocation(planeProg, 'uTime')
	uMVPPlane = gl.getUniformLocation(planeProg, 'uMVP')
	uFogColorPlane = gl.getUniformLocation(planeProg, 'uFogColor')
	uFogNearPlane = gl.getUniformLocation(planeProg, 'uFogNear')
	uFogFarPlane = gl.getUniformLocation(planeProg, 'uFogFar')
	uMVPParticle = gl.getUniformLocation(particleProg, 'uMVP')
	uFogColorParticle = gl.getUniformLocation(particleProg, 'uFogColor')
	uFogNearParticle = gl.getUniformLocation(particleProg, 'uFogNear')
	uFogFarParticle = gl.getUniformLocation(particleProg, 'uFogFar')

	if (window.outerWidth >= 1024) {
		window.addEventListener('resize', init)
		init()
		animate(0)
	} else {
		init()
	}

	return canvas
})())
