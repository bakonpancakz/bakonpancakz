(() => {
    const href = document.location.href
    const token = new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('token')
    if (token) CallAPI('POST', '/v1/auth/verify-email/' + token, 'public')
    CreateMessage(
        'Email Verified',
        'Thank you for verifying your email! Redirecting you to your profile...',
        'Done', () => window.location.assign('/profile')
    )
})()