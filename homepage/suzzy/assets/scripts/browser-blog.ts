// Widget: Latest Articles
(() => {
    let articleIndex = 0
    let autoScrollEnabled = true
    const elemControls = document.querySelector<HTMLDivElement>('div.widget-latest-controls')!
    const elemArticles = document.querySelector<HTMLDivElement>('div.widget-latest-articles')!
    const listArticles = elemArticles.querySelectorAll<HTMLDivElement>('div.latest-item')
    const listDots = elemControls.querySelectorAll<HTMLDivElement>('div.dot-circle')
    const gapOffset = parseInt(window
        .getComputedStyle(elemArticles)
        .getPropertyValue('gap')
    )

    // Autoscrolling Behaviour
    function transitionNextArticle(shouldAdd) {
        // Over/Underflow Handling
        shouldAdd ? articleIndex++ : articleIndex--
        if (articleIndex < 0) articleIndex = listArticles.length - 1
        const desiredIndex = (articleIndex % listArticles.length)

        // Set Active Dot
        listDots.forEach((e, i) => {
            e.classList.remove('dot-active')
            if (desiredIndex === i) e.classList.add('dot-active')
        })

        // Scroll over to post
        let scrollOffset = 0
        for (let i = 0; i < desiredIndex; i++) {
            scrollOffset += listArticles[i].offsetWidth + gapOffset
        }
        elemArticles.scrollLeft = scrollOffset
    }
    setInterval(() => autoScrollEnabled && transitionNextArticle(true), 10_000)
    elemArticles.onmouseenter = () => autoScrollEnabled = false
    elemArticles.onmouseleave = () => autoScrollEnabled = true
    elemControls.onmouseenter = () => autoScrollEnabled = false
    elemControls.onmouseleave = () => autoScrollEnabled = true

    // Back/Next Buttons
    document
        .querySelector<HTMLButtonElement>('button#latest-next')!
        .addEventListener('click', () => transitionNextArticle(true))
    document
        .querySelector<HTMLButtonElement>('button#latest-last')!
        .addEventListener('click', () => transitionNextArticle(false))
})()