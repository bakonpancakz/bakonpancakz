(() => {
    // Audio Elements
    /** Converts seconds into a timestamp (ex. 0:00) */
    function formatTime(someTime) {
        const minutes = (someTime / 60) | 0
        someTime -= minutes * 60
        return `${minutes}:${(someTime | 0).toString().padStart(2, '0')}`
    }

    document.querySelectorAll('div.element-audio').forEach(audioElement => {
        const elemAudio = audioElement.querySelector<HTMLAudioElement>('audio')!
        const elemProgress = audioElement.querySelector<HTMLInputElement>('input')!
        const elemButton = audioElement.querySelector<HTMLButtonElement>('button')!
        const elemButtonIcon = audioElement.querySelector<HTMLImageElement>('button img')!
        const elemTime = audioElement.querySelector<HTMLParagraphElement>('p.audio-time')!
        const elemDownload = audioElement.querySelector<HTMLAnchorElement>('a.audio-download')!

        let isLoaded = false
        let isDragging = false
        let ignoreInput = false
        elemButton.addEventListener('click', () => {
            if (ignoreInput) return
            if (!isLoaded) {
                // Load Audio Source
                ignoreInput = true
                elemAudio.src = elemDownload.href
                elemAudio.oncanplay = () => {
                    elemProgress.removeAttribute('disabled')

                    // Audio Seeking
                    elemProgress.addEventListener('mousedown', () => isDragging = true)
                    elemProgress.addEventListener('mouseup', () => isDragging = false)
                    elemProgress.addEventListener('change', () => {
                        elemAudio.currentTime = elemAudio.duration * (parseInt(elemProgress.value) / 100)
                    })

                    // Audio Controls
                    elemAudio.addEventListener('play', () => elemButtonIcon.src = '/assets/icons/icon-pause.svg')
                    elemAudio.addEventListener('pause', () => elemButtonIcon.src = '/assets/icons/icon-play.svg')
                    elemAudio.addEventListener('timeupdate', () => {
                        elemTime.textContent = (formatTime(elemAudio.currentTime) + '/' + formatTime(elemAudio.duration))

                        // Prevent progress bar from moving while user is still dragging it:
                        // elemProgress 'change' event will update the bar each second causing the
                        // progress bar to snap back and forth between actual playtime and desired playtime (mouse position)
                        if (!isDragging) {
                            elemProgress.value = (((100 / elemAudio.duration) * elemAudio.currentTime) | 0).toString()
                        }
                    })

                    // Play Audio and Finish Setup
                    elemAudio.play()
                    elemAudio.volume = 0.5
                    ignoreInput = false
                    isLoaded = true
                }
            } else {
                elemAudio.paused ? elemAudio.play() : elemAudio.pause()
            }
        })
    })

    // Code Block Elements
    document.querySelectorAll('div.element-code').forEach(parentElement => {
        const action = parentElement.querySelector('button')!
        const content = parentElement.querySelector('pre')!
        action.addEventListener('click', () => {
            navigator.clipboard.writeText(content.textContent!)
            alert('Content Copied to Clipboard!')
        })
    })

    // Chapter Hightlighting
    const chapters = new Array<[HTMLAnchorElement, HTMLParagraphElement]>()
    let scroll_debounce = false
    let scroll_offset = 0
    let scroll_search = ''
    let scroll_tracks = new Array<{ source: any; key: string; }>()

    if (window.location.pathname.startsWith('/library')) {
        scroll_search = 'div.layout-navigation a.navigation-chapter'
        scroll_tracks = [
            { 'source': document.querySelector('div.layout-content'), 'key': 'scrollTop' },
            { 'source': window, key: 'scrollY' }
        ]
    }
    if (window.location.pathname.startsWith('/blog')) {
        scroll_search = 'div.article-chapters a'
        scroll_tracks = [{ 'source': window, key: 'scrollY' }]
        scroll_offset = 64
    }

    // Find and locate all Chapter Links
    document.querySelectorAll<HTMLAnchorElement>(scroll_search).forEach(anchor => {
        const href = anchor.href.split('#').at(-1)
        if (!href) return
        const head = document.querySelector<HTMLParagraphElement>(`p#${href}`)
        if (head) chapters.push([anchor, head])
    })

    // Listen to page scroll events
    function onPageScroll(x: number) {
        chapters.forEach(([link, header], i, a) => {
            (
                x >= (!i ? 0 : header.offsetTop) &&
                x <= (a[i + 1]?.[1]?.offsetTop || Infinity)
            )
                ? link.setAttribute('active', 'true')
                : link.removeAttribute('active')
        })
    }
    for (const { source, key } of scroll_tracks) {
        source.addEventListener('scroll', () => {
            if (scroll_debounce) return
            scroll_debounce = true
            window.requestAnimationFrame(() => {
                onPageScroll(source[key] + scroll_offset)
                scroll_debounce = false
            })
        })
    }
    onPageScroll(0)
})()