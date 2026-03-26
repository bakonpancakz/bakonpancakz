(() => {
    const href = document.location.href
    const token = new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('token')
    if (token) CallAPI('POST', '/v1/auth/verify-login/' + token, 'public')
    CreateMessage(
        'Login Verified',
        'You can log in from the your new device. Redirecting you to the login page...',
        'Done', () => window.location.assign('/login')
    )
})()