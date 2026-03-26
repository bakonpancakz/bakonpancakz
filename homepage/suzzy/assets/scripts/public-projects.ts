document
    .querySelectorAll<HTMLDivElement>('div.widget-project')
    .forEach(project => {
        let currentImage = 0
        const galleryDots = project.querySelectorAll<HTMLDivElement>('div.gallery-dot')!
        const galleryItems = project.querySelectorAll<HTMLImageElement>('img.gallery-image')!
        const galleryScroll = project.querySelector<HTMLDivElement>('div.project-gallery-scroll')!
        const gapOffset = parseInt(window
            .getComputedStyle(galleryScroll)
            .getPropertyValue('gap')
        )

        function ScrollImage(shouldAdd: boolean) {
            // Over/Underflow Handling
            shouldAdd ? currentImage++ : currentImage--
            if (currentImage < 0) currentImage = galleryItems.length - 1
            const desiredIndex = (currentImage % galleryItems.length)

            // Set Active Dot
            galleryDots.forEach((e, i) => {
                i === desiredIndex ?
                    e.classList.add('gallery-dot-active')
                    : e.classList.remove('gallery-dot-active')
            })

            // Scroll over to image
            let scrollOffset = 0
            for (let i = 0; i < desiredIndex; i++) {
                scrollOffset += galleryItems[i].offsetWidth + gapOffset
            }
            galleryScroll.scrollLeft = scrollOffset
        }

        // Back/Next Buttons
        project
            .querySelector('button#last')!
            .addEventListener('click', () => ScrollImage(false))
        project
            .querySelector('button#next')!
            .addEventListener('click', () => ScrollImage(true))
    })