(() => {
    const correctAnswer = 2560660350
    const soundSet = document.querySelector("audio#audio-set"); soundSet.volume = 0.2
    const soundDel = document.querySelector("audio#audio-del"); soundDel.volume = 0.2
    document.
        querySelector("div.layout-content")
        .addEventListener(
            // Prevent annoying context menu popup whenever you miss a grid tile by 1 pixel
            "contextmenu",
            e => e.preventDefault()
        )

    // Setup Board //
    document.querySelectorAll("button.picross-button").forEach(e => {
        e.addEventListener("click", () => {
            e.classList.remove("state-ignore")
            e.classList.toggle("state-active")
                ? soundSet.play()
                : soundDel.play()
        })
        e.addEventListener("contextmenu", ev => {
            ev.preventDefault()
            e.classList.remove("state-active")
            e.classList.toggle("state-ignore")
            soundDel.play()
        })
    })

    // Setup Timer //
    function getTime() {
        const f = s => s.toString().padStart(2, "0")
        const h = Math.floor(t / 3600)
        const m = Math.floor(t % 3600 / 60)
        const s = Math.floor(t % 60)
        return `Time Spent: ${f(h)}:${f(m)}:${f(s)}`
    }
    let t = 0
    const timerElement = document.querySelector("p.layout-timer")
    setInterval(() => {
        t++
        timerElement.textContent = getTime()
    }, 1000)

    // Action: Submit //
    document.querySelector("a#action-send").addEventListener("click", () => {

        // Check Answer
        let givenAnswer = 0
        document.querySelectorAll('div.picross-row').forEach((childRow, rowIndex) => {
            let childIndex = 0
            for (const child of childRow.children) {
                if (child.nodeName === 'BUTTON') {
                    if (child.classList.contains('state-active')) {
                        givenAnswer += 1 << ((rowIndex - 3) * 9) + childIndex
                    }
                    childIndex++
                }
            }
        })
        if (correctAnswer !== givenAnswer) {
            alert("Nope! Try Again")
            return
        }

        // Redirect to Certificate PDF
        const time = getTime()
        const name = prompt("Congratulations you win! Please enter your name for your certificate:", "Anon")
        window.location.replace(
            `/secret/picross/award?name=${encodeURIComponent(name)}&time=${encodeURIComponent(time)}`
        )
    })

})()