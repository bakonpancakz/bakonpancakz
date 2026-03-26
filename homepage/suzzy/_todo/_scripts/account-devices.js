(async () => {
    const _Collection = $('#application-collection')
    const _Template = $('#device-template')
    _Template.removeAttribute('hidden')
    _Template.removeAttribute('id')
    _Template.remove()

    // Fetch Sessions
    SendRequest('GET', '/api/v1/users/@me/security/sessions', null, 1)
        .then(([_, body]) => {

            // There's at minimum one session so we
            // don't need a the 'No Connections' type message here.

            body.sessions
                .sort((a, b) => new Date(b.last_used) - new Date(a.last_used))
                .forEach(session => {
                    // Metadata
                    const Template = _Template.cloneNode(true)
                    const Me = (session.fingerprint === body.fingerprint)
                    if (Me) $$(Template, '#me').removeAttribute('hidden')
                    $$(Template, '#browser').textContent = session.browser
                    $$(Template, '#location').textContent = session.location
                    $$(Template, '#lastseen').textContent = (() => {
                        const secondsAgo = (new Date() - new Date(session.last_used)) / 1000 | 0
                        if (secondsAgo < 60) {
                            return 'just now'
                        } else {
                            const timeUnits = [
                                ['minute', 60],
                                ['hour', 3600],
                                ['day', 86400],
                                ['week', 604800],
                                ['month', 2592000],
                            ];
                            for (const [unit, divisor] of timeUnits) {
                                if (secondsAgo < (divisor * 60)) {
                                    const count = Math.floor(secondsAgo / divisor)
                                    return `${count} ${unit}${count > 1 ? 's' : ''} ago`
                                }
                            }
                        }
                    })()

                    // Buttons
                    const Button = $$(Template, '.device-action')
                    Button.title = `Revoke Access for '${session.browser}' from '${session.location}'`
                    $$(Template, '.device-action').onclick = async () => {
                        await CreateModal({
                            behaviour: {
                                title: 'Revoke Session?',
                                tooltip: 'You\'ll have to manually log back in on this device.'
                            }
                        })
                        SendRequest('DELETE', `/api/v1/users/@me/security/sessions/${session.id}`, null, 2)
                            .then(() => {
                                // Redirect User to Login page if revoked self.
                                Template.remove()
                                if (Me) window.location.href = '/login'
                            })
                            .catch(e => {
                                $$(Template, '#error-message').textContent = e
                            })
                    }

                    // Append
                    _Collection.appendChild(Template)
                })
        })
        .catch(e => {
            // Display Error Message
            $('#alert-error').removeAttribute('hidden')
            $('#error-message').textContent = e
            console.log(e)
        })
        .finally(() => {
            // Hide Loading Symbol
            $('#alert-load').setAttribute('hidden', true)
        })
})()