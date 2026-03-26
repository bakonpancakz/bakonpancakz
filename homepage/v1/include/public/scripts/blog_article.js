// @ts-check

(() => { // Table of Content Highlights

    /** @type {HTMLDivElement | null} */
    const parentChapter = document.querySelector("div.article-chapters")
    /** @type {HTMLDivElement | null} */
    const parentArticle = document.querySelector("div.article-content")

    if (!parentChapter || !parentArticle) return

    /** @type {Array<{ o: number; e: Array<Element | null> }>} */
    let scrollSections = []
    let scrollHeader = null
    let scrollOffset = 0

    // Generate Table of Contents
    for (const child of parentArticle.children) {
        const offset = (child.getBoundingClientRect().top + window.scrollY + scrollOffset) | 0
        const normal = child.textContent.toString().toLocaleLowerCase().replaceAll(" ", "-")

        if (child.classList.contains("element-header")) {
            const anchor = document.createElement("a")
            anchor.classList.add("chapter")
            anchor.textContent = child.textContent
            anchor.href = "#" + normal
            child.id = normal
            parentChapter.appendChild(anchor)

            scrollSections.push({ o: offset, e: [anchor] })
            scrollHeader = anchor
            scrollOffset += 36 // bandaid fix for desync
        }

        if (child.classList.contains("element-subheader")) {
            const anchor = document.createElement("a")
            anchor.classList.add("section")
            anchor.textContent = child.textContent
            anchor.href = "#" + normal
            child.id = normal
            parentChapter.appendChild(anchor)

            scrollSections.push({ o: offset, e: [scrollHeader, anchor] })
        }
    }

    // Update Highlight when Page Scrolls
    function pageScroll() {
        const winoffset = window.innerHeight / 5
        const position = window.scrollY + winoffset
        let closest = null
        let closestDist = Infinity

        // Find Closest Header
        for (const section of scrollSections) {
            const dist = Math.abs(position - section.o)
            if (dist < closestDist) {
                closestDist = dist
                closest = section
            }
            for (const elem of section.e) {
                // Reset Styling
                elem && elem.removeAttribute("selected")
            }
        }

        // Apply Header Styling
        if (closest) {
            for (const elem of closest.e) {
                elem && elem.setAttribute("selected", "")
            }
        }
    }
    window.addEventListener("scroll", pageScroll)
    pageScroll()

})();

(() => { // Share Button

    /** @type {HTMLButtonElement | null} */
    const shareButton = document.querySelector("a#button-share")
    /** @type {HTMLDialogElement | null} */
    const shareModal = document.querySelector("dialog.layout-dialog")

    // UX: Close Modal if Background is clicked or pressed
    shareModal && shareModal.addEventListener("click", ev => {
        if (ev.target === shareModal) {
            shareModal.close()
        }
    })

    // UX: Open Native Modal on Mobile, Custom Modal on Desktop
    shareButton && shareButton.addEventListener("click", ev => {
        ev.preventDefault()

        // Use Native Modal
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        if (isMobile) {
            const metaTitle = document.querySelector(`meta[property="og:title"]`)?.getAttribute("content")
            const metaURL = document.querySelector(`meta[property="og:url"]`)?.getAttribute("content")
            if (typeof (metaURL) !== "string" || typeof (metaTitle) !== "string") {
                alert("Missing Required Metadata")
                return
            }
            navigator.share({ title: metaTitle, url: metaURL })
            return
        }

        // Use Desktop Modal
        if (shareModal) {
            shareModal.showModal()
        }
    })
})();