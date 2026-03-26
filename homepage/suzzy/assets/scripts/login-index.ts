let debounce = false
CreateModal([
    //- Login View
    {
        elements: {
            '1': { type: 'headline', label: 'Log In', },
            '2': { type: 'text', label: 'to your suzzy games account' },
            '3': { type: 'divider' },
            'email': { type: 'input', inputType: 'text', label: 'Email Address', },
            'password': { type: 'input', inputType: 'password', label: 'Password', },
            '4': { type: 'spacer', },
            '5': { type: 'link', label: 'Forgot Password?', href: '/password-reset', },
            '6': { type: 'link', label: 'Don\'t have an account? Sign up.', href: '/signup', },
        },
        closeLabel: 'Cancel',
        closeLogic: () => FollowRedirect('/'),
        submitLabel: 'Log In',
        submitLogic: async (modal, values) => {
            return { success: false, messages: 'Not Yet Implemented' }
        },
    },

    // Verification Email Sent Prompt
    {
        submitLabel: 'Done',
        submitLogic: async m => {
            m.SetActiveView(0)
            return { success: false, messages: '' }
        },
        elements: {
        },
    },

])
    .then(r => console.log('done', r))
    .catch(e => console.error('fail', e))