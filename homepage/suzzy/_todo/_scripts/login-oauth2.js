(() => {
    // Fetch Application and Profile
    const href = window.location.href
    const query = href.slice(href.indexOf('?') + 1)
    SendRequest('GET', '/api/v1/oauth2/authorize', query, 1)
        .then(([_, body]) => {
            const
                me = body.user,
                app = body.application,
                ScopesParent = $('#content-scopes'),
                imageUser = $('#image-user'),
                imageApp = $('#image-app')

            // Set Avatars
            imageUser.src = ImageURL('avatars', me.id, me.avatar, false, 128)
            imageApp.src = ImageURL('icons', app.id, app.icon, false, 128)
            imageUser.alt = `Avatar for '${me.username}'`
            imageApp.alt = `Icon for Application '${app.name}'`

            // Fill Template
            $('#content-login').textContent = `Logged in as ${me.username}, not you?`
            $('#content-aname').textContent = `Connect ${app.name}?`
            $('#content-redirect').textContent += body.redirect
            $('#content-created').textContent += (() => {
                const t = new Date(app.created)
                const m = ['January', 'Feburary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][t.getMonth()]
                const d = t.getDate()
                const y = t.getFullYear()
                return `${m} ${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}, ${y}`
            })()
            _Scopes.forEach(s => {
                if ((body.scopes & s[0]) !== 0) {
                    const div = document.createElement('div')
                    div.classList.add('scope')
                    const dot = document.createElement('div')
                    dot.classList.add('dot-green')
                    const txt = document.createElement('p')
                    txt.textContent = s[1]
                    div.append(dot, txt)
                    ScopesParent.appendChild(div)
                }
            })

            // Cancel Request, go to application with error...
            $('#action-cancel').onclick = (ev) => {
                if (!ev.isTrusted) return
                const url = new URL(body.redirect)
                url.searchParams.set('error', 'access_denied')
                url.searchParams.set('error_description', 'User Declined')
                window.location.assign(url.toString())
            }

            // Complete Request, go to application with code...
            const actionError = $('#action-error')
            $('#action-authorize').onclick = (ev) => {
                if (!ev.isTrusted) return
                const unlock = LockInteraction(true)
                actionError.textContent = ''
                SendRequest('POST', '/api/v1/oauth2/authorize', query, 1)
                    .then(([_, body]) => window.location.assign(body.location))
                    .catch(e => {
                        actionError.textContent = e.error || e
                        console.log(e)
                    })
                    .finally(() => unlock())
            }

            $('#oauth2-flow').removeAttribute('hidden')
        })
        .catch(e => {
            $('#oauth2-fail').removeAttribute('hidden')
            $('#fail-reason').textContent = e.error || e
            console.log(e)
        })
        .finally(() => {
            $('#oauth2-load').setAttribute('hidden', true)
        })
})()