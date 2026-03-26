CreateModal([{
    elements: {
        '1': { type: 'headline', label: 'Sign Up' },
        '2': { type: 'text', label: 'for a suzzy games account' },
        '3': { type: 'divider' },
        'username': { type: 'input', inputType: 'text', label: 'Username' },
        'email': { type: 'input', inputType: 'text', label: 'Email Address' },
        'password': { type: 'input', inputType: 'password', label: 'Password' },
        '4': { type: 'spacer' },
        '5': { type: 'link', label: 'Already have an account? Log in', href: '/login' },
        '6': { type: 'unique-links', text: 'By signing up you agree to our;Terms Of Service:/library/legal/terms-of-service;and;Privacy Policy:/library/legal/privacy-policy' }
    },
    closeLabel: 'Cancel',
    closeLogic: () => FollowRedirect('/'),
    submitLabel: 'Sign Up',
    submitLogic: (modal, { username, email, password }) => {
        return new Promise(async ok => {
            const errorMessages: Record<string, string | undefined> = {}
            errorMessages.username = TestUsernameSuite(username)
            errorMessages.password = TestPasswordSuite(password)
            errorMessages.email = TestEmailSuite(email)
            if (Object.values(errorMessages).filter(e => e).length !== 0) {
                ok({ success: false, messages: errorMessages })
                return
            }

            // Create Account
            let resp = await CallAPI('POST', '/v1/auth/signup', 'public', { username, email, password })
            if (!resp.ok) return ok({
                success: false,
                messages: `Signup Failed (${resp.code}): ${resp.body}`
            })
            // Login Account
            // Use basic auth to allow collection of cookies
            resp = await CallAPI('POST', '/v1/auth/login', 'basic', { email, password })
            if (!resp.ok) return ok({
                success: false,
                messages: `Login Failed (${resp.code}): ${resp.body}`
            })
            FollowRedirect('/profile')
        })
    },
}])

document.querySelector<HTMLInputElement>('#username')!.value = Date.now() + ''
document.querySelector<HTMLInputElement>('#email')!.value = Date.now() + '@gmail.com'
document.querySelector<HTMLInputElement>('#password')!.value = 'Googleman00!'