(() => {
    const
        elemPreviewEmail = $('#preview-email'),
        actionEmailReveal = $('#email-reveal'),
        actionEmailEdit = $('#email-edit'),
        actionEmailResend = $('#email-resend'),
        actionPassChange = $('#password-change'),
        actionMFASetup = $('#mfa-setup-start'),
        actionMFASetupRemove = $('#mfa-setup-remove'),
        actionMFARecoveryView = $('#mfa-recovery-view'),
        actionMFARecoveryRegen = $('#mfa-recovery-regen'),
        actionDangerDeleteAccount = $('#danger-deleteaccount'),
        errorMFA = $('#error-mfa'),
        errorEmail = $('#error-email'),
        errorDanger = $('#error-danger')

    SendRequest('GET', '/api/v1/users/@me', null, 1)
        .then(([_, body]) => {
            // Email
            let emailHidden = false
            let emailTemplate = elemPreviewEmail.textContent
            actionEmailReveal.onclick = () => {
                let newPreview
                if (emailHidden) {
                    newPreview = body.email
                    actionEmailReveal.textContent = 'Hide Email Address'
                } else {
                    const usernameLength = body.email.indexOf('@')
                    const censoredSegment = ''.padStart(usernameLength > 12 ? 12 : usernameLength, '*')
                    const hostSegment = body.email.slice(usernameLength)
                    newPreview = censoredSegment + hostSegment
                    actionEmailReveal.textContent = 'Reveal Email Address'
                }
                elemPreviewEmail.textContent = (emailTemplate + newPreview)
                emailHidden = !emailHidden
            }
            actionEmailReveal.onclick()

            if (!body.verified) {
                actionEmailResend.removeAttribute('hidden')
                actionEmailResend.onclick = () => {
                    const unlock = LockInteraction()
                    SendRequest('POST', '/api/v1/users/@me/security/email', null, 1)
                        .then(() => CreateModal({
                            behaviour: {
                                cancelText: '',
                                submitText: 'Close',
                                title: 'Verification Email Sent',
                                tooltip: 'An email to verify this email address has been sent. Please check your spam or inbox.',
                            }
                        }))
                        .catch(e => errorEmail.textContent = e)
                        .finally(unlock)
                }
            }

            actionEmailEdit.onclick = () => {
                CreateModal({
                    behaviour: {
                        title: 'Update Email',
                        tooltip: 'Changing your email address will mark it as unverified.',
                        onSubmit: ({ email }) => new Promise(ok => {
                            SendRequest('PATCH', '/api/v1/users/@me/security/email', { email }, 2)
                                .then(() => window.location.reload())
                                .catch(ok)
                        })
                    },
                    '_divider': { type: 'divider-line' },
                    'email': {
                        type: 'text',
                        required: true,
                        title: 'Email Address',
                        validator: TestEmailSuite,
                    }
                })
            }

            // Password
            actionPassChange.onclick = () => {
                CreateModal({
                    behaviour: {
                        title: 'Change Password',
                        tooltip: 'Enter your current password and new password.',
                        onSubmit: ({ old_password, new_password }) => new Promise(ok => {
                            SendRequest(
                                'PATCH', '/api/v1/users/@me/security/password',
                                { old_password, new_password }, 1
                            )
                                .then(() => ok())
                                .catch(ok)
                        })
                    },
                    '_link': {
                        type: 'link',
                        title: 'Forgot Password?',
                        href: '/password-reset',
                    },
                    '_divider': { type: 'divider-line' },
                    'old_password': {
                        type: 'password',
                        required: true,
                        title: 'Old Password',
                    },
                    'new_password': {
                        type: 'password',
                        required: true,
                        title: 'New Password',
                        validator: (v, { new_password_again }) => {
                            if (v !== new_password_again) return 'Passwords do not Match'
                            return TestPasswordSuite(v)
                        },
                    },
                    'new_password_again': {
                        type: 'password',
                        required: true,
                        title: 'New Password Again',
                        validator: (v, { new_password }) => {
                            if (v !== new_password) return 'Passwords do not Match'
                            return TestPasswordSuite(v)
                        },
                    },
                })
            }

            // Multi-Factor
            function RecoveryModal(codes) {
                return CreateModal({
                    behaviour: {
                        title: 'Recovery Codes',
                        tooltip:
                            'Keep these recovery codes safe! ' +
                            'You\'ll lose access to your account if both recovery codes and your authenticator app are lost.',
                        submitText: 'Download',
                        cancelText: 'Close',
                        onSubmit: () => {
                            // Generate Text
                            const filename = `Recovery Codes for ${body.username}.txt`
                            const filedata =
                                `Recovery Codes for ${body.username} (${body.email})\n` +
                                `Generated on ${new Date().toLocaleString()}\n` +
                                `------------\n` +
                                codes.map(c => `> ${c}\n`).join('');
                            // Fake Download Element
                            const a = document.createElement('a')
                            a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(filedata))
                            a.setAttribute('download', filename)
                            a.style.display = 'none'
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            return ' '
                        }
                    },
                    '_codes': {
                        type: 'recovery-codes',
                        codes: codes
                    }
                })
            }
            if (body.mfa_enabled) {
                actionMFASetupRemove.removeAttribute('hidden')
                actionMFASetupRemove.onclick = async () => {
                    await CreateModal({
                        behaviour: {
                            title: 'Remove Authenticator App?',
                            tooltip: 'This will disable MFA on your account.',
                        }
                    })
                    const unlock = LockInteraction()
                    SendRequest('DELETE', '/api/v1/users/@me/security/mfa/setup', null, 2)
                        .then(() => window.location.reload())
                        .catch(e => errorMFA.textContent = e)
                        .finally(unlock)
                }
                actionMFARecoveryView.removeAttribute('hidden')
                actionMFARecoveryView.onclick = () => {
                    const unlock = LockInteraction()
                    SendRequest('GET', '/api/v1/users/@me/security/mfa/codes', null, 2)
                        .then(([_, codes]) => RecoveryModal(codes))
                        .catch(e => errorMFA.textContent = e)
                        .finally(unlock)
                }
                actionMFARecoveryRegen.removeAttribute('hidden')
                actionMFARecoveryRegen.onclick = async () => {
                    await CreateModal({
                        behaviour: {
                            title: 'Reset Recovery Codes?',
                            tooltip: 'This will void the previously generated codes.',
                        }
                    })
                    const unlock = LockInteraction()
                    SendRequest('DELETE', '/api/v1/users/@me/security/mfa/codes', null, 2)
                        .then(([_, codes]) => RecoveryModal(codes))
                        .catch(e => errorMFA.textContent = e)
                        .finally(unlock)
                }
            } else {
                actionMFASetup.removeAttribute('hidden')
                actionMFASetup.onclick = () => {
                    const unlock = LockInteraction()
                    SendRequest('GET', '/api/v1/users/@me/security/mfa/setup', null, 1)
                        .then(([_, mfa]) => {
                            CreateModal({
                                behaviour: {
                                    title: 'Setup Authenticator App',
                                    tooltip: 'Scan the QR code using your Authenticator App and enter the generated passcode.',
                                    onSubmit: ({ passcode }) => new Promise(ok => {
                                        const unlock = LockInteraction()
                                        SendRequest('POST', '/api/v1/users/@me/security/mfa/setup', { passcode }, 1)
                                            .then((/* 204 No Content */) => {
                                                RecoveryModal(mfa.recovery_codes)
                                                    .finally(() => window.location.reload())
                                                ok()
                                            })
                                            .catch(ok)
                                            .finally(unlock)
                                    })
                                },
                                '_spacer1': { type: 'divider-line' },
                                '_qrcode': {
                                    type: 'qr-code',
                                    src: mfa.image,
                                },
                                '_spacer2': { type: 'divider-line' },
                                '_secret': {
                                    type: 'text',
                                    title: 'Can\'t Scan the QR Code? Use this secret key:',
                                    value: mfa.secret,
                                    readonly: true,
                                },
                                passcode: {
                                    required: true,
                                    type: 'password',
                                    title: 'Passcode',
                                    autocomplete: 'one-time-code',
                                    placeholder: '123456',
                                    validator: v => {
                                        if (!/[0-9]{6}/.test(v)) return 'Invalid Passcode'
                                        return true
                                    }
                                },
                            })
                        })
                        .catch(e => errorMFA.textContent = e)
                        .finally(unlock)
                }
            }

            // Danger Zone
            actionDangerDeleteAccount.onclick = async () => {
                // Prompt Modal
                await CreateModal({
                    behaviour: {
                        title: 'Delete Account?',
                        tooltip:
                            'This will start a countdown where afterwards your account and all of its data will be deleted. ' +
                            'More details will be sent to your email address.',
                    }
                })
                const unlock = LockInteraction()
                SendRequest('DELETE', '/api/v1/users/@me', null, 2)
                    .then(() => SignOut())
                    .catch(e => errorDanger.textContent = e)
                    .finally(unlock)
            }

            // Display Menu
            $('#security-wrapper').removeAttribute('hidden')
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