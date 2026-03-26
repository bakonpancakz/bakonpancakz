(() => {
    /** @type {HTMLAudioElement | null} */
    const soundActive = document.querySelector('audio#active')
    /** @type {HTMLAudioElement | null} */
    const soundBounce = document.querySelector('audio#bounce')
    /** @type {HTMLCanvasElement | null} */
    const canvas = document.querySelector('canvas#sprites')

    if (canvas && soundActive && soundBounce) {

        const RENDER_WIDTH = 256, RENDER_HEIGHT = 256, GRAVITY = 0.67, BOUNCE = 0.75, JUMP = 8, COUNT = 3
        const TEXTURE_WIDTH = 68, TEXTURE_HEIGHT = 78, TEXTURE_SCALE = 0.5
        const TEXTURE = new Image()
        const SPRITES = new Array()
        const OFFSET = (RENDER_WIDTH - (COUNT * (TEXTURE_WIDTH * TEXTURE_SCALE))) / COUNT

        for (let i = 0; i < COUNT; i++) {
            SPRITES.push({
                x: (OFFSET / 2) + (OFFSET * i) + ((TEXTURE_WIDTH * TEXTURE_SCALE) * i),
                v: 0,
                y: 0
            })
        }

        const ctx = canvas.getContext('2d')
        TEXTURE.src = `data:image/gif;base64,R0lGODlhRABOAPAAAAAAAFJSUiH5BAUKAAAALAAAAABEAE4AAAL/hI+pF+0P45p0uQqi3hD79CjcSF6fZzLlyp1iCrKy5KphPOe3SyP6D0N1fMBioGYxKpFE5ZKZcTqR0urxZM0Ks9Utd1r5WimksFgzKWNy5FHavZ61W0m6eeXt4TYfVp9fBxhX8of2AjeoVrjTZHenmNcQKPiIGHm1RzkHmRhkQHhp2Mlo47hpeUr66TeJV6kadaaZCSurdSjVmIsLtjrG++TbBQzUamT887arWxQqR1s8qkOcLM0GXR0rWRqNbZvN/N3NLd7sXf4cjn59vg7a7o4qHJ+uTs85f+8Krz/E3+9JG0B8AgeaymdQlL2EnhgSdCivIMSAE2dJrIgMI7mKPow4OvJICaRCkXpI+rvokdpEZezSTYvyj5SMjWq20ZS3D6Ggjjkz2sy05RwVPTxgQTk6NCDSpYt+Mn2aB0EBADs=`
        canvas.style.imageRendering = 'pixelated'
        canvas.style.width = `${RENDER_WIDTH}px`
        canvas.style.height = `${RENDER_HEIGHT}px`
        canvas.width = RENDER_WIDTH
        canvas.height = RENDER_HEIGHT
        soundBounce.playbackRate = 2
        soundBounce.volume = 0.5

        canvas.addEventListener('click', () => {
            for (let i = 0; i < COUNT; i++) {
                SPRITES[i].v += JUMP + (Math.random() * (JUMP / 2))
            }
        })

        setInterval(() => {
            ctx.clearRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT)
            for (let i = 0; i < SPRITES.length; i++) {
                let oy = (RENDER_HEIGHT - (TEXTURE_HEIGHT * TEXTURE_SCALE))
                let s = SPRITES[i]
                s.v -= GRAVITY
                s.y += s.v

                if (s.y < 0) {
                    s.y = 0
                    s.v = -s.v * BOUNCE
                    if (Math.abs(s.v) < 0.8) {
                        s.v = 0
                    } else {
                        soundBounce.currentTime = 0
                        soundBounce.play()
                    }
                }

                ctx.drawImage(TEXTURE, s.x,
                    oy - s.y,
                    TEXTURE_WIDTH * TEXTURE_SCALE,
                    TEXTURE_HEIGHT * TEXTURE_SCALE
                )
            }
        }, 1000 / 60);

    }
})()