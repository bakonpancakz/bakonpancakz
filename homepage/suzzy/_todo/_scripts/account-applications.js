(() => {
    // Support Functions
    const trimDataURL = (s, x = undefined) => s.slice(s.indexOf(',') + 1, x)
    const redirectsToString = s => s.sort().join()
    function PrepareTemplate(selector) {
        const elem = $(selector)
        elem.removeAttribute('hidden')
        elem.removeAttribute('id')
        elem.remove()
        return elem
    }

    // No Applications Warning
    let appCount = 0
    function DisplayNoApps(newCount) {
        _ActionCreate.removeAttribute('hidden')
        appCount = newCount
        appCount === 0
            ? _AlertEmpty.removeAttribute('hidden')
            : _AlertEmpty.setAttribute('hidden', true)
    }

    // Displays Modal with Secret Key
    function DisplaySecret(secretKey) {
        CreateModal({
            behaviour: {
                title: 'Your Secret Key',
                tooltip: 'Do not share this key with anyone!',
                submitText: 'Close',
                cancelText: '',
            },
            _secret: {
                type: 'text',
                title: '',
                value: secretKey,
                readonly: true,
            }
        })
    }

    // Use Application Template
    const
        _AlertEmpty = $('#alert-empty'),
        _AlertLoad = $('#alert-load'),
        _ActionCreate = $('#action-create'),
        _Collection = $('#application-collection'),
        _LinkTemplate = PrepareTemplate('.input-redirect'),
        _ItemTemplate = PrepareTemplate('#application-template')

    function DisplayApplication(a) {
        let removingIcon = false
        let unsavedChanges = false
        const
            item = _ItemTemplate.cloneNode(true),
            elemStatus = $$(item, '#status-message'),
            elemOptions = $$(item, '.application-options'),
            elemRedirects = $$(item, '#container-redirects'),
            previewIcon = $$(item, '#app-icon'),
            previewName = $$(item, '#app-name'),
            previewDesc = $$(item, '#app-desc'),
            inputName = $$(item, '#input-name'),
            inputDesc = $$(item, '#input-desc'),
            inputIcon = $$(item, '#input-icon'),
            inputIconFile = $$(item, '#input-icon-file'),
            inputIconRemove = $$(item, '#input-icon-remove'),
            inputRedirectNew = $$(item, '#input-redirect-new'),
            inputSave = $$(item, '#input-save'),
            inputDiscard = $$(item, '#input-discard'),
            inputResetSecret = $$(item, '#input-reset'),
            inputDelete = $$(item, '#input-delete'),
            inputEdit = $$(item, '#input-edit')

        function CreateRedirect(givenURL) {
            const elem = _LinkTemplate.cloneNode(true)
            const inputUrl = elem.firstChild
            inputUrl.value = givenURL
            inputUrl.addEventListener('change', UpdateForm)
            elem.lastChild.addEventListener('click', () => {
                elem.remove()
                UpdateForm()
            })
            elemRedirects.appendChild(elem)
        }
        function ResetForm() {
            removingIcon = false
            previewName.textContent = a.name?.trim() || 'Untitled'
            previewDesc.textContent = a.description?.trim() || 'No Description Provided.'
            previewIcon.src = ImageURL('icons', a.id, a.icon, false, 128)
            previewIcon.alt = `Icon for ${a.name}`
            inputIconFile.value = null
            inputDesc.value = a.description
            inputName.value = a.name
            elemRedirects.innerHTML = ''
            a.redirects.forEach(CreateRedirect)
            UpdateForm()
        }
        function UpdateForm() {
            // New Redirect
            elemRedirects.childElementCount >= 10
                ? inputRedirectNew.setAttribute('hidden', true)
                : inputRedirectNew.removeAttribute('hidden')

            // Remove Icon
            !removingIcon && (a.icon !== null || inputIconFile.files.length > 0)
                ? inputIconRemove.removeAttribute('disabled')
                : inputIconRemove.setAttribute('disabled', true)

            // Save/Discard Changes
            unsavedChanges =
                Object.keys(CollectBody()).length &&
                Array.from(elemRedirects.childNodes).every(e => e.firstChild.checkValidity())
            if (unsavedChanges) {
                inputDiscard.removeAttribute('disabled')
                inputSave.removeAttribute('disabled')
            } else {
                inputDiscard.setAttribute('disabled', true)
                inputSave.setAttribute('disabled', true)
            }
        }
        function CollectBody() {
            const body = {}
            if ((inputName.value.trim() || a.name) !== a.name)
                body['name'] = inputName.value
            if (inputDesc.value.trim() !== (a.description || ''))
                body['description'] = inputDesc.value
            if (removingIcon && body.icon)
                body['icon'] = ''
            if (inputIconFile.files.length)
                body['icon'] = trimDataURL(previewIcon.src)
            const collectedRedirects = Array
                .from(elemRedirects.childNodes)
                .filter(e => e.firstChild.checkValidity())
                .map(e => e.firstChild.value)
            if (redirectsToString(collectedRedirects) !== redirectsToString(a.redirects)) {
                body.redirects = collectedRedirects
            }
            return body
        }

        // Set/Remove Application Icon
        inputIconRemove.addEventListener('click', () => {
            previewIcon.src = ImageURL('icon', a.id, null)
            inputIconFile.value = null
            removingIcon = true
            UpdateForm()
        })
        inputIconFile.addEventListener('change', ev => {
            const file = ev.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = e => {
                previewIcon.src = e.target.result
                removingIcon = false
                UpdateForm()
            }
            reader.readAsDataURL(file)
        })

        // Field Updating
        inputName.addEventListener('input', () => previewName.textContent = inputName.value.trim() || a.name)
        inputDesc.addEventListener('input', () => previewDesc.textContent = inputDesc.value.trim() || a.description)
        for (const needsListener of [inputName, inputDesc]) {
            needsListener.addEventListener('change', UpdateForm)
        }
        // Button Listeners
        inputRedirectNew.addEventListener('click',
            () => CreateRedirect('')
        )
        inputDiscard.addEventListener('click',
            () => ResetForm()
        )
        inputIcon.addEventListener('click',
            () => inputIconFile.click()
        )
        inputEdit.addEventListener('click', () => {
            elemOptions.classList.toggle('options-hidden')
            ResetForm()
        })
        inputSave.addEventListener('click', () => {
            if (!unsavedChanges) return
            const unlock = LockInteraction()
            elemStatus.textContent = 'Saving Changes...'
            SendRequest('PATCH', `/api/v1/users/@me/applications/${a.id}`, CollectBody(), 1)
                .then(([_, patchedBody]) => {
                    elemStatus.textContent = 'Changes Saved!'
                    elemStatus.classList.remove('text-error')
                    a = patchedBody
                    unlock()
                    ResetForm()
                })
                .catch(e => {
                    elemStatus.textContent = e
                    elemStatus.classList.add('text-error')
                    unlock()
                })
            // we dont use finally block here because race condition :p
        })
        inputResetSecret.addEventListener('click', () => CreateModal({
            behaviour: {
                title: 'Reset Secret Key?',
                tooltip: `${a.name} will stop functioning until you update the secret key in your code.`,
                submitText: 'Reset',
                onSubmit: () => new Promise(ok => {
                    SendRequest('DELETE', `/api/v1/users/@me/applications/${a.id}/reset`, undefined, 2)
                        .then(([_, body]) => {
                            DisplaySecret(body.secret_key)
                            ok()
                        })
                        .catch(ok)
                })
            }
        }))
        inputDelete.addEventListener('click', () => CreateModal({
            behaviour: {
                title: 'Delete Application?',
                tooltip: `${a.name} will be deleted and all connections will be severed. This action cannot be undone.`,
                submitText: 'Delete',
                onSubmit: () => new Promise(ok => {
                    SendRequest('DELETE', `/api/v1/users/@me/applications/${a.id}`, undefined, 2)
                        .then(() => {
                            item.remove()
                            DisplayNoApps(appCount - 1)
                            ok()
                        })
                        .catch(ok)
                })
            }
        }))

        // Append to top
        // Official Application?
        if ((a.flags & 1 << 3) !== 0) {
            $$(item, '#verified-message').removeAttribute('hidden')
        }
        $$(item, '#input-clientid').textContent += a.id
        ResetForm()
        _Collection.appendChild(item)
    }

    // Fetch Connections

    SendRequest('GET', '/api/v1/users/@me/applications', null, 1)
        .then(([_, body]) => {
            // Display Applications
            body
                .sort((a, b) => new Date(b.created) - new Date(a.created))
                .forEach(DisplayApplication)
            DisplayNoApps(body.length)

            // Bind Create Application
            _ActionCreate.addEventListener('click', function ActionCreate() {
                CreateModal({
                    behaviour: {
                        title: 'Create Application',
                        tooltip: 'Name it something cool like Phase Connect.',
                        onSubmit: ({ name }) => new Promise(ok => {
                            SendRequest('POST', '/api/v1/users/@me/applications', { name }, 1)
                                .then(([_, body]) => {
                                    DisplaySecret(body.secret_key)
                                    DisplayNoApps(appCount + 1)
                                    DisplayApplication(body)
                                    ok()
                                })
                                .catch(ok)
                        })
                    },
                    _divider: { type: 'divider-line' },
                    name: {
                        type: 'text',
                        required: true,
                        title: 'Name',
                        validator: function ValidateName(v) {
                            if (v.length > 24) return 'Application name cannot be longer than 32 characters'
                            if (v.length < 1) return 'Application name cannot be shorter than 1 character'
                            return true
                        }
                    },
                })
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