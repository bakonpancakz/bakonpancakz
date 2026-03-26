CreateModal([
    {
        submitLabel: 'Submit',
        submitLogic: (modal, { email }) => new Promise(ok => {
            const result = TestEmailSuite(email)
            if (result) return ok({ success: false, messages: { 'email': result } })
            CallAPI('POST', '/v1/auth/password-reset', 'public', { email }).then(resp => {
                // This endpoint always returns a '204 No Content' 
                // so anything else other than that is a server error
                if (resp.error) return ok({
                    success: false,
                    messages: String(resp.error)
                })
                modal.SetActiveView(1)
                return ok({ success: false, messages: '' })
            })
        }),
        elements: {
            '1': { type: 'headline', label: 'Reset Password', },
            '2': { type: 'text', label: 'for your suzzy games account' },
            '3': { type: 'divider' },
            'email': { type: 'input', inputType: 'text', label: 'Email Address' },
            '4': { type: 'spacer' },
            '5': { type: 'link', label: 'Remember your password? Log in.', href: '/login', },
        },
    },
    {
        closeLabel: 'Done',
        closeLogic: () => window.location.assign('/login'),
        elements: {
            '1': { type: 'header', label: 'Email Sent' },
            '2': { type: 'text', label: "An email with instructions on how to reset your password has been sent to your inbox." },
            '3': { type: 'text', label: "Can't find it? Try checking your spam filter." },
        }
    }
])