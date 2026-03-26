(() => {
    const
        _Profile = $('.profile-wrapper'),
        _Preview = $('.profile-container'),
        _Status = $('#profile-status'),
        // Option Elements
        iDisplayname = $('#input-displayname'),
        iSubtitle = $('#input-subtitle'),
        iBio = $('#input-bio'),
        iAvatarFile = $('#input-avatar-file'),
        iBannerFile = $('#input-banner-file'),
        iBannerColor = $('#input-banner'),
        iBorderColor = $('#input-border'),
        iBackgroundColor = $('#input-background'),
        iSubmit = $('#button-submit'),
        iCancel = $('#button-cancel'),
        // Preview Elements
        pBanner = $('#profile-banner'),
        pAvatar = $('#profile-avatar'),
        pBadges = $('#profile-badges'),
        pDisplayname = $('#profile-displayname'),
        pUsername = $('#profile-username'),
        pSubtitle = $('#profile-subtitle'),
        pDivider = $('#profile-divider'),
        pBio = $('#profile-bio'),
        // Buttons
        bAvatar = $('#button-avatar-remove'),
        bBanner = $('#button-banner-remove')

    // Elements that the user interacts with in real time
    const _InputElements = [
        iDisplayname,
        iSubtitle,
        iBio,
        iBannerColor,
        iBorderColor,
        iBackgroundColor,
        // These elements have async calls
        // they'll update the preview when complete
        // pBanner,
        // pAvatar,
    ]
    const _RecognizedBadges = [
        [1 << 0, 'crown', 'The Boss'],
        [1 << 1, 'star', 'V.I.P'],
        [1 << 2, 'picross', 'Picross Master'],
    ]

    SendRequest('GET', '/api/v1/users/@me', null, 1)
        .then(([_, body]) => {
            let removingBanner = false
            let removingAvatar = false
            let unsavedChanges = false
            const hexToDec = e => parseInt(e.value.slice(1), 16)
            const trimDataURL = (s, x = undefined) => s.slice(s.indexOf(',') + 1, x)
            const decToHex = (e, x) => '#' + (e?.toString(16).padStart('6', 0) || x)

            function FormReset() {
                const colorBanner = decToHex(body.accent_banner, '1d1e2e')
                const colorBorder = decToHex(body.accent_border, '282a3f')
                const colorBackground = decToHex(body.accent_background, '333550')

                // Reset Options
                iDisplayname.value = body.displayname
                iSubtitle.value = body.subtitle
                iBio.value = body.biography
                iBannerColor.value = colorBanner
                iBorderColor.value = colorBorder
                iBackgroundColor.value = colorBackground
                iAvatarFile.value = null
                iBannerFile.value = null

                // Reset Preview
                pDisplayname.textContent = body.displayname
                pUsername.textContent = '@' + body.username
                pSubtitle.textContent = body.subtitle
                pBio.textContent = body.biography
                body.biography
                    ? pDivider.removeAttribute('hidden')
                    : pDivider.setAttribute('hidden', true)
                pAvatar.src = ImageURL('avatars', body.id, body.avatar, true, 128)
                pBanner.style.backgroundImage = body.banner
                    ? `url('${ImageURL('banners', body.id, body.banner, true, 512)}')`
                    : ''
                _Profile.style.setProperty('--accent-banner', colorBanner)
                _Profile.style.setProperty('--accent-border', colorBorder)
                _Profile.style.setProperty('--accent-background', colorBackground)
                iBackgroundColor.oninput()

                // Disable Buttons 
                removingAvatar = false
                removingBanner = false
                FormUpdated()
            }
            function FormUpdated() {
                unsavedChanges = (Object.entries(CollectBody()).length > 0)
                if (unsavedChanges) {
                    iCancel.removeAttribute('disabled')
                    iSubmit.removeAttribute('disabled')
                } else {
                    iCancel.setAttribute('disabled', true)
                    iSubmit.setAttribute('disabled', true)
                }
                !removingBanner && (body.banner !== null || iBannerFile.files.length > 0)
                    ? bBanner.removeAttribute('disabled')
                    : bBanner.setAttribute('disabled', true)

                !removingAvatar && (body.avatar !== null || iAvatarFile.files.length > 0)
                    ? bAvatar.removeAttribute('disabled')
                    : bAvatar.setAttribute('disabled', true)
            }
            function CollectBody() {
                const data = {}
                // Collect Textboxes
                if ((iDisplayname.value.trim() || body.displayname) !== body.displayname)
                    data['displayname'] = iDisplayname.value
                if (iBio.value.trim() !== (body.biography || ''))
                    data['biography'] = iBio.value
                if (iSubtitle.value.trim() !== (body.subtitle || ''))
                    data['subtitle'] = iSubtitle.value

                // Collect Colors
                const decBannerColor = hexToDec(iBannerColor)
                if (decBannerColor !== (body.accent_banner || 1908270))
                    data['accent_banner'] = decBannerColor
                const decBorderColor = hexToDec(iBorderColor)
                if (decBorderColor !== (body.accent_border || 2632255))
                    data['accent_border'] = decBorderColor
                const decBackgroundColor = hexToDec(iBackgroundColor)
                if (decBackgroundColor !== (body.accent_background || 3355984))
                    data['accent_background'] = decBackgroundColor

                // Collect Images
                if (removingAvatar && body.avatar) data['avatar'] = ''
                if (removingBanner && body.banner) data['banner'] = ''
                if (iAvatarFile.files.length)
                    data['avatar'] = trimDataURL(pAvatar.src)
                if (iBannerFile.files.length)
                    data['banner'] = trimDataURL(pBanner.style.backgroundImage, -2)

                console.log(data)
                return data
            }

            // Templating
            _InputElements.forEach(e => e.addEventListener('change', FormUpdated))
            _RecognizedBadges.forEach(b => {
                if ((body.public_flags & b[0]) !== 0) {
                    const img = document.createElement('img')
                    img.src = `/assets/images/icons/badge-${b[1]}.svg`
                    img.title = b[2]
                    img.alt = b[2]
                    pBadges.appendChild(img)
                }
            })

            // Section: About Me
            iDisplayname.oninput = () => pDisplayname.textContent = (iDisplayname.value || body.displayname).trim()
            iSubtitle.oninput = () => pSubtitle.textContent = iSubtitle.value.trim()
            iBio.oninput = () => {
                const content = (iBio.value || '')
                pBio.textContent = content.trim()
                content.length > 0
                    ? pDivider.removeAttribute('hidden')
                    : pDivider.setAttribute('hidden', true)
            }

            // Section: Images
            $('#button-avatar').onclick = () => iAvatarFile.click()
            $('#button-banner').onclick = () => iBannerFile.click()
            bAvatar.onclick = () => {
                pAvatar.src = ImageURL('avatars', body.id, null)
                iAvatarFile.value = null
                removingAvatar = true
                FormUpdated()
            }
            bBanner.onclick = () => {
                pBanner.style.backgroundImage = null
                iBannerFile.value = null
                removingBanner = true
                FormUpdated()
            }

            iAvatarFile.onchange = (ev) => {
                const file = ev.target.files[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = e => {
                    pAvatar.src = e.target.result
                    removingAvatar = false
                    FormUpdated()
                }
                reader.readAsDataURL(file)
            }
            iBannerFile.onchange = (ev) => {
                const file = ev.target.files[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = e => {
                    pBanner.style.backgroundImage = `url(${e.target.result})`
                    removingBanner = false
                    FormUpdated()
                }
                reader.readAsDataURL(file)
            }

            // Section: Accents 
            iBannerColor.oninput = () => _Profile.style.setProperty('--accent-banner', iBannerColor.value)
            iBorderColor.oninput = () => _Profile.style.setProperty('--accent-border', iBorderColor.value)
            iBackgroundColor.oninput = () => {
                let hexColor = iBackgroundColor.value
                _Profile.style.setProperty('--accent-background', hexColor)

                // Check Luminance of Background Color
                hexColor = hexColor.replace('#', '')
                var r = parseInt(hexColor.substr(0, 2), 16)
                var g = parseInt(hexColor.substr(2, 2), 16)
                var b = parseInt(hexColor.substr(4, 2), 16)
                if (((0.299 * r) + (0.587 * g) + (0.114 * b)) / 255 > 0.85) {
                    _Preview.classList.add('profile-dark')
                } else {
                    _Preview.classList.remove('profile-dark')
                }
            }

            // Section: Actions
            iCancel.onclick = () => FormReset()
            iSubmit.onclick = () => {
                if (!unsavedChanges) return
                const unlock = LockInteraction()
                _Status.textContent = 'Saving Changes...'
                SendRequest('PATCH', '/api/v1/users/@me', CollectBody(), 1)
                    .then(([_, patchedBody]) => {
                        _Status.textContent = 'Profile Saved!'
                        _Status.classList.remove('text-error')
                        localStorage.removeItem('cache_home_me') // Used by page-home.js
                        body = patchedBody
                        unlock()
                        FormReset()
                    })
                    .catch(e => {
                        _Status.textContent = e
                        _Status.classList.add('text-error')
                        unlock()
                    })
                // we dont use finally block here because race condition :p
            }

            // Display Profile
            _Profile.removeAttribute('hidden')
            FormReset()
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