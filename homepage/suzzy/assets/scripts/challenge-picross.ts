(async () => {
    {
        // Setup Grid Tiles
        const audioSet = document.querySelector<HTMLAudioElement>('audio#set')!
        const audioRelease = document.querySelector<HTMLAudioElement>('audio#release')!
        document.querySelectorAll<HTMLButtonElement>('button.picross-button').forEach(e => {
            e.addEventListener('click', () => {
                e.classList.remove('picross-ignore')
                e.classList.toggle('picross-active')
                    ? audioSet.play()
                    : audioRelease.play()
            })
            e.addEventListener('contextmenu', ev => {
                ev.preventDefault()
                e.classList.remove('picross-active')
                e.classList.toggle('picross-ignore')
                audioRelease.play()
            })
        })

        // Setup Page Timer
        let secondsElapsed = 0
        const timerElement = document.querySelector('p#time-spent')!
        setInterval(() => {
            secondsElapsed++
            timerElement.textContent = (() => {
                const hours = Math.floor(secondsElapsed / 3600)
                const minutes = Math.floor((secondsElapsed % 3600) / 60)
                const seconds = Math.floor(secondsElapsed % 60);
                return `Time Spent: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            })()
        }, 1000)


        // Prevent annoying context menu popup when you miss a grid tile by 1 pixel :L
        document.
            querySelector('div.special-picross')!
            .addEventListener('contextmenu', e => e.preventDefault())
    }

    // Fetch Badges for User Profile
    const resp = await CallAPI<{ public_flags: number; }>('GET', '/v1/users/@me', 'basic')
    if (resp.code === 401) {
        console.info('User is not logged in, redirecting...')
        CreateMessage(
            'Account Required', 'You must be logged in to attempt this challenge!',
            'Login', () => window.location.assign('/login?redirect=/challenge-picross')
        )
        return
    }
    if (!resp.success) {
        console.error(`Server Responded with Code ${resp.code}`, resp.body)
        return CreateMessage(
            'Server Unavailable',
            'Encountered an error while fetching your profile',
            'Refresh',
            () => window.location.reload(),
        )
    }

    // Setup Webpage
    const correctAnswer = 2560660350
    const completed = (resp.json.public_flags & 4) !== 0
    if (completed) CreateMessage(
        'Already Collected!',
        `You\'ve already collected this badge, but you can still replay this challenge.`,
        'Got it!',
        () => { }
    )

    // Setup Submit Button
    document.querySelector<HTMLButtonElement>('a#done')!.addEventListener('click', async () => {
        SetDynamic(false)

        // Filter: Correct Answer?
        let givenAnswer = 0
        document.querySelectorAll<HTMLDivElement>('div.picross-row').forEach((childRow, rowIndex) => {
            let childIndex = 0
            for (const child of childRow.children) {
                if (child.nodeName === 'BUTTON') {
                    if (child.classList.contains('picross-active')) {
                        givenAnswer += 1 << ((rowIndex - 3) * 9) + childIndex
                    }
                    childIndex++
                }
            }
        })
        if (correctAnswer !== givenAnswer) {
            CreateMessage('Nope!', 'Not quite! Check your work and try again!', 'Fine', () => { })
            SetDynamic(true)
            return
        }

        // Filter: Already Completed?
        if (completed) return CreateMessage(
            'Congrats!',
            'But you\'ve already collected this badge. Thank you for playing!',
            'Visit Profile',
            () => window.location.assign('/profile')
        )

        // Redeem Reward for User
        const resp = await CallAPI(
            'POST', '/v1/users/@me/inventory/redeem', 'basic',
            { code: 'challenge-' + givenAnswer }
        )
        if (resp.ok) {
            CreateMessage(
                'Congrats!',
                'You\'ve earned the picross badge! You it is now visible on your profile.',
                'Let me see!',
                () => window.location.assign('/profile')
            )
        } else {
            CreateMessage('Redeem Error', resp.body, 'Close', () => { })
            console.error('Redeem Error', resp)
        }
        SetDynamic(true)
    })
})()