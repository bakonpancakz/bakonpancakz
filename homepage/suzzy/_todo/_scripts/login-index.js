let x = {
    static: true,
    submitText: 'Log In',
    cancelText: '',
    onSubmit: ({ email, password }) => new Promise(submitResult => {
        const unlock = LockInteraction()
        SendRequest('POST', '/api/v1/auth/login', { email, password }, 0, false)
            .then(([resp, body]) => {
                if (!resp.ok) {
                    // Display Custom Modal
                    switch (body.code) {
                        case 2000: // ERROR_MFA_EMAIL_SENT
                            return CreateModal({
                                behaviour: {
                                    cancelText: '',
                                    title: 'Verify Login from a New Device',
                                    tooltip: 'Check your email for a verification link to authorize access from this device.'
                                },
                            })
                                .catch(() => { /** Silence Modal Closing */ })
                        case 2001: // ERROR_MFA_PASSCODE_REQUIRED
                            return CreateModal({
                                'behaviour': {
                                    title: 'Passcode Required',
                                    tooltip: 'Please enter your Authenticator Passcode or Recovery Code to log in.',
                                    onSubmit: ({ passcode }) => new Promise(mfaResult => {
                                        SendRequest('POST', '/api/v1/auth/login', { email, password, passcode }, 0)
                                            .then(([_, body]) => {
                                                // Store Credentials
                                                localStorage.setItem('auth_token', body.token)
                                                localStorage.setItem('auth_expires', Date.now() + (body.expires_in * 1000))
                                                FollowRedirect('/account/profile')
                                            })
                                            .catch(mfaResult)
                                    })
                                },
                                '_spacer': {
                                    type: 'divider-line'
                                },
                                'passcode': {
                                    required: true,
                                    type: 'password',
                                    title: 'Passcode',
                                    autocomplete: 'one-time-code',
                                    placeholder: '123456',
                                    validator: v => {
                                        if (!/([0-9]{6}|[A-z0-9]{8})/.test(v))
                                            return 'Invalid Passcode'
                                        return true
                                    }
                                }
                            })
                                .catch(() => { /** Silence Modal Closing */ })
                        default:
                            return submitResult(body.error || body)
                    }
                } else {
                    // Store Credentials
                    localStorage.setItem('auth_token', body.token)
                    localStorage.setItem('auth_expires', Date.now() + (body.expires_in * 1000))
                    FollowRedirect('/account/profile')
                }
            })
            .catch(submitResult)
            .finally(unlock)
    }),
}