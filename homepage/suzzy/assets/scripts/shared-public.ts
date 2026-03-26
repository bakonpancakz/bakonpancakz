(() => {
    // Have Footer always be just slightly out of view
    {
        const footerWrapper = document.querySelector<HTMLDivElement>('div.wrapper-footer')
        if (footerWrapper) {
            footerWrapper.style.marginTop = Math.max(
                document.documentElement.clientHeight -
                (document.body.clientHeight - footerWrapper.clientHeight), 0
            ) + 'px'
        }
    }
    // Navigation Bar - Profile
    // Cache for this is invalidated and updated by another script
    {
        interface MinimalProfileResponse {
            id: number;
            avatar: string | null;
        }
        let loggedIn = true
        const profileButton = document.querySelector<HTMLAnchorElement>('a#navigation-profile')!
        const profileCache = sessionStorage.getItem('cache_profile')
        profileCache
            ? UpdateProfile(JSON.parse(profileCache))
            : FetchProfile()

        /** Redirect to profile if logged in, otherwise prompt login */
        profileButton.addEventListener('click', () => loggedIn
            ? window.location.assign('/profile')
            : window.location.assign('/login')
        )
        /** Update Profile Elements */
        function UpdateProfile(data: undefined | MinimalProfileResponse) {
            if (data === undefined) return loggedIn = false
            profileButton.style.backgroundImage = `url('${ImageURL('avatars', data.id, data.avatar, true, "small")}')`
        }
        /** Fetch Profile from API */
        function FetchProfile() {
            CallAPI<MinimalProfileResponse>('GET', '/v1/users/@me', 'basic').then(resp => {
                if (resp.ok) {
                    sessionStorage.setItem('cache_profile', resp.body)
                    UpdateProfile(resp.json)
                } else {
                    UpdateProfile(undefined)
                    console.error(`[PROFILE] Fetch Failed`, resp.error)
                }
            })
        }
    }
    // Navigation Bar - Status
    // Fetches player count and server status from service every 5 minutes
    // TODO: Add random offset so traffic spike doesn't disintegrate the server lol
    {
        const CLASS_RED = 'status-red'
        const CLASS_YEL = 'status-yellow'
        const CLASS_GRN = 'status-green'
        const ELEMENT_DOT = document.querySelector<HTMLDivElement>('div#status-dot')!
        const ELEMENT_TXT = document.querySelector<HTMLParagraphElement>('p#status-text')!
        FetchStatus()

        /** Update Status Elements */
        function UpdateStatus(status: undefined | { status: "online" | "degraded" | "down" | "none"; counter_players_online?: number; }) {
            for (const c of [CLASS_RED, CLASS_YEL, CLASS_GRN]) ELEMENT_DOT.classList.remove(c)
            if (status !== undefined) switch (status.status) {
                case "online":
                    ELEMENT_DOT.classList.add(CLASS_GRN)
                    ELEMENT_TXT.textContent = `Online • ${status.counter_players_online} players`
                    break
                case "degraded":
                    ELEMENT_DOT.classList.add(CLASS_YEL)
                    ELEMENT_TXT.textContent = `Service Degraded • ${status.counter_players_online} players`
                    break
                case "down":
                    ELEMENT_DOT.classList.add(CLASS_RED)
                    ELEMENT_TXT.textContent = 'Service Down'
                    break
                case "none":
                    ELEMENT_TXT.textContent = "Unknown"
                    break
            }
        }
        /** Fetch Status from API */
        function FetchStatus() {
            fetch(ENV_URLS.status + '/api/widget.json').then(async resp => {
                const REFRESH_IN = parseFloat(resp.headers.get('X-Refresh')!) * 1000 | 0
                if (resp.status === 503) {
                    setTimeout(FetchStatus, REFRESH_IN)
                    return
                } else if (resp.status === 200) {
                    UpdateStatus(await resp.json())
                    return
                } else {
                    console.error(`[STATUS] Request Failed with Status Code ${resp.status}:`, await resp.text())
                    UpdateStatus({ status: "none" })
                }
            })
        }
    }
})()