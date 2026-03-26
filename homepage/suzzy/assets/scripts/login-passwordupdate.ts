CreateModal([
    {
        submitLabel: 'Submit',
        submitLogic: (modal, values) => new Promise(ok => {
            const messages: Record<string, string | undefined> = {}
            const key_password = 'password'
            const key_password_again = 'password_again'
            messages[key_password] = TestPasswordSuite(values[key_password])
            messages[key_password_again] = TestPasswordSuite(values[key_password_again])
            if (values[key_password] !== values[key_password_again]) {
                messages[key_password_again] = 'Passwords Do Not Match'
            }
            if (Object.values(messages).filter(e => e).length !== 0) {
                ok({ success: false, messages })
                return
            }

            // Fetch Token from Parameters and Send Request
            const href = document.location.href
            const token = new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('token')
            CallAPI<any>(
                'PATCH', '/v1/auth/password-reset', 'basic',
                { [key_password]: values[key_password], token }
            ).then(resp => {
                if (!resp.ok) return ok({ success: false, messages: resp.json.error })
                modal.SetActiveView(1)
                ok({ success: false, messages: '' })
            })
        }),
        elements: {
            '1': { type: 'headline', label: 'Change Password', },
            '2': { type: 'text', label: 'Enter the new password you wish to use.' },
            '3': { type: 'divider' },
            'password': { type: 'input', inputType: 'password', label: 'New Password' },
            'password_again': { type: 'input', inputType: 'password', label: 'New Password Again' },
            '4': { type: 'spacer' },
        },
    },
    {
        closeLabel: 'Log In',
        closeLogic: () => window.location.assign('/login'),
        elements: {
            '1': { type: 'header', label: 'Password Changed' },
            '2': { type: 'text', label: 'You may now log in using your new password. You have not been logged out on any devices.' },
        }
    }
])