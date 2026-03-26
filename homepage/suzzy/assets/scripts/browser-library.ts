(() => {
    const enum STATE {
        HELP = 0,       // Help Message
        CLOSED,         // Menu Hidden
        LOADING,        // Loading Results
        ERRORED,        // Search Error
        EMPTY,          // No Results Returned
        LIST,           // List all Results
        OPEN            // Open Modal
    }
    const paneLoading = document.querySelector<HTMLDivElement>('div.pane#loading')!
    const paneError = document.querySelector<HTMLDivElement>('div.pane#error')!
    const paneHelp = document.querySelector<HTMLDivElement>('div.pane#help')!
    const paneEmpty = document.querySelector<HTMLDivElement>('div.pane#empty')!
    const paneResults = document.querySelector<HTMLDivElement>('div.pane#results')!

    const elementWrapper = document.querySelector<HTMLDivElement>('div.wrapper-search')!
    const elementInput = document.querySelector<HTMLInputElement>('input.search-input')!
    const elementClose = document.querySelector<HTMLButtonElement>('button.search-close')!
    const elementOpen = document.querySelector<HTMLButtonElement>('button#search-open')!
    const elementFooter = document.querySelector<HTMLParagraphElement>('div.search-footer > p')!
    const elementError = paneError.querySelector<HTMLParagraphElement>('p')!

    let searchTimings = 0
    let searchElements = new Array<HTMLAnchorElement>()
    let searchTimeout: ReturnType<typeof setTimeout>
    let searchState = STATE.CLOSED      // Modal State
    let searchFocus = -1                // Selected Element Index (-1 for Input, -2 for Close)
    let searchQuery = ''                // Previous Search Query
    let searchError = ''                // API Error
    let searchResults = new Array<{     // API Data
        categoryName: string;
        occurrences: Array<{
            location: string;
            snippet: string;
            link: string;
        }>;
    }>()

    function updateView(state: STATE) {
        paneLoading.style.opacity = '0'
        paneError.style.opacity = '0'
        paneHelp.style.opacity = '0'
        paneEmpty.style.opacity = '0'
        paneResults.style.opacity = '0'
        if (state === STATE.OPEN) {
            state = searchResults.length > 0
                ? STATE.LIST
                : STATE.HELP
        }
        if (state !== STATE.CLOSED && searchState === STATE.CLOSED) {
            elementWrapper.style.pointerEvents = 'all'
            elementWrapper.style.opacity = '1'
            updateFocus(-1, true)
        }
        searchState = state
        switch (state) {
            case STATE.HELP:
                elementFooter.textContent = ''
                paneHelp.style.opacity = '1'
                return

            case STATE.EMPTY:
                elementFooter.textContent = ''
                paneEmpty.style.opacity = '1'
                return

            case STATE.LOADING:
                elementFooter.textContent = ''
                paneLoading.style.opacity = '1'
                return

            case STATE.ERRORED:
                paneError.style.opacity = '1'
                elementError.textContent = searchError
                return

            case STATE.CLOSED:
                elementWrapper.style.pointerEvents = 'none'
                elementWrapper.style.opacity = '0'
                return

            case STATE.LIST:
                const t = Date.now() - searchTimings
                const c = searchResults.map(r => r.occurrences.length).reduce((a, b) => a + b, 0)
                elementFooter.textContent = `Returned ${c} result${c === 1 ? '' : 's'} in ${t}ms`

                // Clear All Children
                for (const c of paneResults.children) c.remove()
                searchElements = []

                // Display Empty Results
                if (c === 0) {
                    updateView(STATE.EMPTY)
                    return
                }

                // Render Children
                for (const cat of searchResults) {
                    const div = document.createElement('div')
                    div.classList.add('search-result')

                    const p = document.createElement('p')
                    p.classList.add('text-header', 'text-tip')
                    p.textContent = cat.categoryName
                    div.appendChild(p)

                    for (const o of cat.occurrences) {
                        const a = document.createElement('a')
                        a.classList.add('search-item')
                        a.href = o.link

                        const p1 = document.createElement('p')
                        p1.innerHTML = o.snippet
                        a.appendChild(p1)

                        const p2 = document.createElement('p')
                        p2.classList.add('text-muted', 'text-tip')
                        p2.textContent = o.location
                        a.appendChild(p2)

                        div.appendChild(a)
                        searchElements.push(a)
                    }

                    paneResults.appendChild(div)
                }
                return
        }
    }
    function updateFocus(adjust: number, set = false) {
        set ? searchFocus = adjust : searchFocus += adjust
        if (isNaN(searchFocus)) searchFocus = -1
        if (searchFocus > searchElements.length - 1) searchFocus = searchElements.length - 1
        if (searchFocus < -2) searchFocus = -2
        if (searchFocus === -2) return elementClose.focus()
        if (searchFocus === -1) return elementInput.focus()

        console.log("FOCUS", searchElements[searchError])
    }

    // Keybind Handling
    const pressedKeys = new Set<string>()
    document.addEventListener('keyup', ev => pressedKeys.delete(ev.key))
    document.addEventListener('keydown', ev => {
        pressedKeys.add(ev.key)
        if (pressedKeys.has('Control') && ev.key === 'k') {
            ev.preventDefault()
            updateView(searchState === STATE.CLOSED ? STATE.OPEN : STATE.CLOSED)
        }
        if (searchState !== STATE.CLOSED) {
            if (ev.key === 'Escape') updateView(STATE.CLOSED)
            if (ev.key === 'ArrowUp') updateFocus(-1)
            if (ev.key === 'ArrowDown') updateFocus(1)
            if (ev.key === 'ArrowLeft' && searchFocus === -2) updateFocus(-1, true)
            if (ev.key === 'ArrowRight' && searchFocus === -1) updateFocus(-2, true)
        }
    })
    elementClose.addEventListener('click', () => updateView(STATE.CLOSED))
    elementOpen.addEventListener('click', () => updateView(STATE.OPEN))
    elementWrapper.addEventListener('click', ev =>
        ev.target === elementWrapper && updateView(STATE.CLOSED)
    )
    elementInput.addEventListener('input', () => {
        clearTimeout(searchTimeout)

        const query = encodeURIComponent(elementInput.value.trim())
        if (query.length === 0) return updateView(STATE.HELP)
        if (query === searchQuery) return
        searchQuery = query
        updateView(STATE.LOADING)

        // Queue Search Request
        searchTimeout = setTimeout(() => {
            searchTimings = Date.now()
            fetch(`/library/snippet?query=${query}`)
                .then(resp => resp.json())
                .then(body => {
                    searchResults = body
                    updateView(STATE.LIST)
                })
                .catch(e => {
                    console.error('SEARCH ERROR', e)
                    searchError = String(e)
                    updateView(STATE.ERRORED)
                })
        }, 200)
    })

    // // Restore Session (if any)
    // const cacheFocus = localStorage.getItem('search_focus')
    // const cacheQuery = localStorage.getItem('search_query')
    // const cacheResult = localStorage.getItem('search_data')
    // if (cacheResult && cacheQuery && cacheFocus) {
    //     elementInput.value = cacheQuery
    //     searchResults = JSON.parse(cacheResult)
    //     updateFocus(parseInt(cacheFocus), true)
    // } else {
    //     updateView(STATE.CLOSED)
    // }
})()