(() => {
    const encodeSVG  /**/ = svg => "data:image/svg+xml;base64," + btoa(svg)
    const formatDate /**/ = str => new Date(str).toDateString().slice(4).toUpperCase()
    const icons = {
        // NOTE: External Images should have the version parameter appended to them.
        //       e.g. /public/.../image.png?v=${dataVersion}
        diamond_fill:        /**/ encodeSVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><polygon points="8,0 16,8 8,16 0,8" style="fill:#a0a0a0"/></svg>`),
        diamond_empty:       /**/ encodeSVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M8,0L0,8l8,8,8-8L8,0ZM3,8l5-5,5,5-5,5-5-5Z" style="fill: #a0a0a0"/></svg>`),
        icon_cross:          /**/ encodeSVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><polygon style="fill:#c0c0c0" points="0 0 0 3 6 8 0 13 0 16 3 16 8 10 13 16 16 16 16 13 10 8 16 3 16 0 13 0 8 6 3 0 0 0"/></svg>`),
        icon_rss:            /**/ encodeSVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon  style="fill:#c0c0c0" points="6.4 64 0 57.6 6.4 48 16 57.6 6.4 64"/><polyline style="fill:#c0c0c0" points="25.6 64 38.4 64 33.6 30.4 0 25.6 0 38.4 20.8 43.2"/><polyline style="fill:#c0c0c0" points="51.2 64 64 64 59.2 4.8 0 0 0 12.8 46.4 17.6"/></svg>`),
        icon_top:            /**/ encodeSVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><polygon style="fill:#c0c0c0" points="1 0 31 0 32 6 0 6 1 0"/><polygon style="fill:#c0c0c0" points="0 32 0 24 16 8 32 24 32 32 16 20 0 32"/></svg>`),
        tags_development:    /**/ encodeSVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><polygon style="fill:#c0c0c0" points="8 2 5 2 4 0 3 2 0 2 2 4 0 8 4 6 8 8 6 4 8 2"/></svg>`),
        tags_personal:       /**/ encodeSVG(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 13"><polygon style="fill:#c0c0c0" points="9 13 0 4 4 0 9 3 14 0 18 4 9 13"/></svg>`),
        author_bakonpancakz: /**/ `data:image/gif;base64,R0lGODlhRABOAPAAAAAAAMDAwCH5BAUKAAAALAAAAABEAE4AAAL/hI+pF+0P45p0uQqi3hD79CjcSF6fZzLlyp1iCrKy5KphPOe3SyP6D0N1fMBioGYxKpFE5ZKZcTqR0urxZM0Ks9Utd1r5WimksFgzKWNy5FHavZ61W0m6eeXt4TYfVp9fBxhX8of2AjeoVrjTZHenmNcQKPiIGHm1RzkHmRhkQHhp2Mlo47hpeUr66TeJV6kadaaZCSurdSjVmIsLtjrG++TbBQzUamT887arWxQqR1s8qkOcLM0GXR0rWRqNbZvN/N3NLd7sXf4cjn59vg7a7o4qHJ+uTs85f+8Krz/E3+9JG0B8AgeaymdQlL2EnhgSdCivIMSAE2dJrIgMI7mKPow4OvJICaRCkXpI+rvokdpEZezSTYvyj5SMjWq20ZS3D6Ggjjkz2sy05RwVPTxgQTk6NCDSpYt+Mn2aB0EBADs=`,
    }

    // Parse Data from Webpage //
    const dataVersion  /**/ = document.querySelector("data[key='version']").value
    const dataManifest /**/ = JSON.parse(document.querySelector("data[key='manifest']").value)
    {
        // Additional Validation //
        if (!dataManifest.articles) /**/ throw "Missing Key: .articles" // Type: Metadata
        if (!dataManifest.authors)  /**/ throw "Missing Key: .authors"  // Type: Filter
        if (!dataManifest.links)    /**/ throw "Missing Key: .links"    // Type: Metadata
        if (!dataManifest.tags)     /**/ throw "Missing Key: .tags"     // Type: Filter

        const lookupAuthor /**/ = new Set(dataManifest.authors.map(t => t.id))
        const lookupTags   /**/ = new Set(dataManifest.tags.map(t => t.id))
        console.info("Authors IDs:", [...lookupAuthor].join(", "))
        console.info("Tags IDs:   ", [...lookupTags].join(", "))

        dataManifest.articles = dataManifest.articles.filter((a, i) => {
            if (!a.date) {
                console.warn(`Article '${a.id}' has no date and will be hidden.`)
                return false
            }
            for (const t of a.tags) {
                if (!lookupTags.has(t)) {
                    console.warn(`Article '${a.id}' has an unknown tag id (${t})`)
                    return false
                }
            }
            if (!lookupAuthor.has(a.author)) {
                console.warn(`Article '${a.id}' has an unknown author id (${a.author})`)
                return false
            }

            console.info(`Article OK: ${a.id}`)
            return true
        })
    }

    // Render Functions //
    let articleHeader  /**/ = document.querySelector("div.article-header")
    let articleContent /**/ = document.querySelector("div.article-content")
    let navigation     /**/ = document.querySelector("nav.section-navigation")
    let listArticles   /**/ = document.querySelector("div.article-list")
    let listChapters   /**/ = null

    function updateNavigation() {

        function templateLink(link, name, description, icon) {
            const image = icon.startsWith("script:")
                ? icons[icon.slice(7)]
                : icon // use uri
            const html = `
                <a class="item-nav animation-fadein" href="${link}">
                    <div class="item-nav-text">
                        <p class="animation-scrollin item-nav-text-anchor">${name}</p>
                        <p class="animation-scrollin item-nav-text-content">${description}</p>
                    </div>
                    <div class="item-nav-icon">
                        <div class="item-nav-icon-background"></div>
                        <img class="item-nav-icon-foreground" alt="Icon for ${name}" src="${image}">
                    </div>
                </a>
            `
            return html
        }

        function templateList(name) {
            let htmlKey /**/ = name.toLocaleLowerCase()
            let dataKey /**/ = `blog_togglestate_${htmlKey}`
            let result  /**/ = localStorage.getItem(dataKey)
            let active  /**/ = (result === null) ? true : (result === "true")

            // Create Toggle Buttons //
            navigation.insertAdjacentHTML("beforeend", `
                <button class="nav-header" for="${htmlKey}">
                    <span>${name}</span>
                    <img alt="Toggle open state for list ${name}">
                </button>
                <div class="nav-list" id="${htmlKey}">
                </div>
            `)
            const list   /**/ = navigation.querySelector(`div.nav-list#${htmlKey}`)
            const header /**/ = navigation.querySelector(`button.nav-header[for="${htmlKey}"]`)
            const icon   /**/ = header.querySelector("img")

            function update() {
                localStorage.setItem(dataKey, active)
                list.style.display = active
                    ? "" // reset
                    : "none"
                icon.src = active
                    ? icons.diamond_fill
                    : icons.diamond_empty
                active
                    ? header.classList.add("open")
                    : header.classList.remove("open")
            }
            header.onclick = () => {
                active = !active
                update()
            }
            update()

            return list
        }

        // Render Nav Links //
        templateList("LINKS").innerHTML = dataManifest.links
            .map(l => templateLink(l.id, l.name, l.description, l.icon))
            .join("\n")
        templateList("TAGS").innerHTML = dataManifest.tags
            .map(t => templateLink(`/blog/?filter[tag]=${t.id}`, t.name, t.description, t.icon))
            .join("\n")
        templateList("AUTHORS").innerHTML = dataManifest.authors
            .map(a => templateLink(`/blog/?filter[author]=${a.id}`, a.name, a.description, a.icon))
            .join("\n")
        listChapters = templateList("CHAPTERS")

    }
    updateNavigation()

    function updateArticle() {
        articleContent.replaceChildren()
        articleHeader.replaceChildren()
        listArticles.replaceChildren()
        listChapters.replaceChildren()

        const slug    /**/ = new URL(window.location.href).pathname.slice("/blog/".length)
        const article /**/ = dataManifest.articles.find(a => a.id == slug)

        if (article) {

            // Display Article //
            document.title = `panca.kz - Blog - ${article.title}`

            // Download Article Content [ASYNC] //
            fetch(`/public/blog/${slug}/content.html?v=${dataVersion}`)
                .then(async resp => {

                    // Insert Article Content //
                    // Yes, we are exploiting ourselves (safely). But I want the ability to
                    // implement custom elements and features to specific articles in the future.
                    if (!resp.ok) {
                        throw `Server responded with ${resp.status} ${resp.statusText}`
                    }
                    articleContent.insertAdjacentHTML("beforeend", await resp.text())
                    articleContent.querySelectorAll("script").forEach(s => {
                        eval(s.innerHTML)
                    })

                    // Generate Article Chapters //
                    let chapterHTML = ""
                    for (const item of articleContent.children) {
                        const normalize = c => {
                            const v = c.textContent.toLocaleLowerCase().replaceAll(" ", "-")
                            c.id = v
                            return v
                        }
                        if (item.classList.contains("element-header")) {
                            chapterHTML += `<a class="animation-scrollin chapter" href="#${normalize(item)}">${item.textContent}</a>\n`
                        }
                        if (item.classList.contains("element-subheader")) {
                            chapterHTML += `<a class="animation-scrollin section" href="#${normalize(item)}">${item.textContent}</a>\n`
                        }
                    }
                    listChapters.innerHTML = chapterHTML

                })
                .catch(err => {
                    // Generic Fetch Error //
                    console.error("<Cannot Download Article!>", err)
                    articleContent.innerHTML += `
                        <p style="color: red; text-align: center;" class="animation-blink">
                            Fetch Error, please see console for more information.
                        </p>
                    `
                })

            // Render Article Header (Metadata) //
            const author /**/ = dataManifest.authors.find(a => a.id === article.author)
            const tags   /**/ = article.tags.map(id => dataManifest.tags.find(t => t.id === id))

            listChapters.innerHTML += `
                <p class="nav-message">... LOADING ARTICLE ...</p>
            `
            articleHeader.innerHTML += `
                <img 
                    id="header-banner" 
                    fetchpriority="high" 
                    alt="Banner for ${article.title}" 
                    src="${article.banner_main}?v=${dataVersion}">
                    
                <h1 class="effect-docked" id="header-title">
                    ${article.title}
                </h1>

                <div class="header-chevrons">
                    <div class="effect-chevron-container" id="header-about">
                        <span class="effect-chevron-point-right" id="article-author">
                            ${author.name}
                        </span>
                        <span class="effect-chevron-point-right" id="article-published">
                            ${formatDate(article.date)}
                        </span>
                    </div>
                    <div class="effect-chevron-container" id="header-tags">
                        ${tags.map(t => `<span class="effect-chevron-point-left">${t.name}</span>`).join("\n")}
                    </div>
                </div>
            `

        } else {

            // Display Search //
            document.title = `panca.kz - Blog`

            // Collect Filters and Articles //
            const params = new URLSearchParams(window.location.search)
            const filterTags = new Set(params
                .getAll("filter[tag]")
                .filter(s => dataManifest.tags.findIndex(t => t.id.localeCompare(s) === 0) > -1)
            )
            const filterAuthor = new Set(params
                .getAll("filter[author]")
                .filter(s => dataManifest.authors.findIndex(t => t.id.localeCompare(s) === 0) > -1)
            )
            const results = dataManifest.articles
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .filter(a => {

                    // Need Requested Author //
                    if (filterAuthor.size > 0) {
                        if (!filterAuthor.has(a.author)) return false
                    }

                    // Need Requested Tags //
                    if (filterTags.size > 0) {
                        let missedTag = false
                        filterTags.forEach(t => {
                            if (a.tags.findIndex(s => s === t) === -1) {
                                missedTag = true
                            }
                        })
                        if (missedTag) {
                            return false
                        }
                    }

                    return true
                })

            // Render Results //
            listChapters.innerHTML += `
                <p class="nav-message">... SELECT ARTICLE ...</p>
            `
            listArticles.innerHTML += `
                <div class="item-article-count">
                    <p class="animation-scrollin item-article-count-text">
                        ${results.length} RESULT${results.length === 1 ? "" : "s"}
                        ${new Array(...filterTags.values()).map(s => `&lt;TAG:${s.toUpperCase()}&gt;`).join(" ")}
                        ${new Array(...filterAuthor.values()).map(s => `&lt;AUTHOR:${s.toUpperCase()}&gt;`).join(" ")}
                        <span class="animation-blink item-article-count-cursor">
                            _
                        </span>
                    </p>
                </div>
            `
            listArticles.innerHTML += results.map((a, i) => `
                <a class="item-article" href="/blog/${a.id}" style="animation-delay: ${i * 200}ms;">
                    <div class="item-article-layer">
                        <img 
                            class="item-article-banner" 
                            onload="this.classList.add('animation-fadein')" 
                            alt="Banner for ${a.title}" 
                            src="${a.banner_list}?v=${dataVersion}">
                    </div>
                    <div class="item-article-layer item-article-meta">
                        <p class="animation-scrollin item-article-meta-title">${a.title}</p>
                        <p class="animation-fadein item-article-meta-description">${a.description}</p>
                        <div class="animation-fadein item-article-meta-tags">
                            <span>${formatDate(a.date)}</span>
                            ${a.tags.map(t => `<span>${t.toUpperCase()}</span>`).join("\n")}
                        </div>
                    </div>
                </a>
            `)
                .join("\n")
        }
    }
    updateArticle()


    // History Overrides //
    window.addEventListener("popstate", () => {
        updateArticle()
    })
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a")
        if (!link) return

        const url = new URL(link.href)

        // Ignore non-blog links
        if (!url.pathname.startsWith("/blog/")) return
        if (url.pathname.startsWith("/blog/rss.xml")) return

        // Handle chapter links 
        const current = new URL(window.location.href)
        if (
            url.pathname === current.pathname &&
            url.search === current.search &&
            url.hash
        ) {
            // Smooth scroll into section
            e.preventDefault()
            const target = document.querySelector(url.hash)
            if (target) {
                target.scrollIntoView({ behavior: "smooth" })
            }
            return
        }

        // Update Application
        e.preventDefault()
        history.pushState(null, "", url.pathname + url.search + url.hash)
        updateArticle()
    })


})()