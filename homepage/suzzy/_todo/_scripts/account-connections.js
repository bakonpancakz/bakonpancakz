(async () => {
    const _AlertEmpty = $('#alert-empty')
    const _AlertLoad = $('#alert-load')
    const _Collection = $('#application-collection')

    // Prepare Templates
    function prepareTemplate(name) {
        const elem = $(name)
        elem.removeAttribute('hidden')
        elem.removeAttribute('id')
        elem.remove()
        return elem
    }
    const _ItemTemplate = prepareTemplate('#application-template')
    const _ScopeTemplate = prepareTemplate('#scope-template')

    // Fetch Connections
    SendRequest('GET', '/api/v1/users/@me/connections', null, 1)
        .then(([_, body]) => {
            if (body.length === 0) {
                _AlertEmpty.removeAttribute('hidden')
                return
            }
            body
                .sort((a, b) => new Date(b.created) - new Date(a.created))
                .forEach(connection => {

                    // Metadata
                    const { name, flags, description, id, icon } = connection.application
                    const Template = _ItemTemplate.cloneNode(true)
                    $$(Template, '.text-header').textContent = name
                    $$(Template, '.text-tip').textContent = description || 'No Description Provided.'

                    // Images
                    const Image = $$(Template, '.application-icon')
                    Image.src = ImageURL('icons', id, icon, false, 128)
                    Image.alt = `Icon for ${name}`

                    // Scopes
                    const ScopesParent = Template.querySelector('.scopes')
                    _Scopes.forEach(s => {
                        if ((connection.scopes & s[0]) !== 0) {
                            const Scope = _ScopeTemplate.cloneNode(true)
                            Scope.lastChild.textContent = s[1]
                            ScopesParent.appendChild(Scope)
                        }
                    })

                    // Official Application?
                    if ((flags & 1 << 3) !== 0) {
                        $$(Template, '#verified-message').removeAttribute('hidden')
                    }

                    // Buttons
                    const Button = $$(Template, 'button')
                    Button.title = `Disconnect Application ${name}`
                    Button.addEventListener('click', async () => {
                        await CreateModal({
                            behaviour: {
                                title: 'Disconnect Application?',
                                tooltip: 'The application ' + name + ' will be disconnected from your account.'
                            }
                        })
                        SendRequest('DELETE', `/api/v1/users/@me/connections/${connection.id}`, null, 2)
                            .then(() => {
                                // Remove Item from List
                                body.length--
                                Template.remove()
                                if (body.length === 0) {
                                    _AlertEmpty.removeAttribute('hidden')
                                    _AlertLoad.setAttribute('hidden', true)
                                    return
                                }
                            })
                            .catch(e => {
                                $$(Template, '#error-message').textContent = e
                            })
                    })

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
            _AlertLoad.setAttribute('hidden', true)
        })
})()