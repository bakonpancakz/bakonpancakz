const FLAGS_OAUTH2_SCOPES = [
    [1 << 0, 'View your Profile'],
    [1 << 1, 'View your Email'],
    [1 << 2, 'View your Connections'],
]
const FLAGS_PROFILE_BADGES = [
    [1 << 0, 'The Boss', '/icons/badge-crown'],
    [1 << 1, 'V.I.P', '/icons/badge-star'],
    [1 << 2, 'Picross Master', '/icons/badge-picross'],
]

/** Variables that change if in localhost */
const ENV_URLS = (() => {
    const IN_DEBUG = window.location.hostname.includes('localhost')
    return {
        'status': IN_DEBUG ? 'http://localhost:8200' : 'https://status.suzzygames.com',
        'api': IN_DEBUG ? 'http://localhost:8000' : 'https://apis.suzzygames.com',
        'cdn': IN_DEBUG ? 'http://localhost:8100' : 'https://content.suzzygames.com',
    }
})()

function TestEmailSuite(v: string): string | undefined {
    if (v.length === 0) return 'Required Field'
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(v)) return 'Invalid or Malformed Email Address'
}
function TestPasswordSuite(v: string): string | undefined {
    if (v.length === 0) return 'Required Field'
    if (!/[^A-Za-z0-9]/.test(v)) return 'Password must contain a Special Character'
    if (!/[A-Z]/.test(v)) return 'Password must contain an Uppercase Character'
    if (!/[a-z]/.test(v)) return 'Password must contain a Lowercase Character'
    if (!/[0-9]/.test(v)) return 'Password must contain a Number'
    if (v.length < 8) return 'Password cannot be shorter than 8 characters'
    if (v.length > 256) return 'Password cannot be longer than 256 characters'
}
function TestUsernameSuite(v: string): string | undefined {
    if (v.length === 0) return 'Required Field'
    if (!/[\w]/.test(v)) return 'Username must be Alphanumeric [a-zA-z0-9_]'
    if (v.length < 3) return 'Username cannot be shorter than 3 characters'
    if (v.length > 32) return 'Password cannot be longer than 32 characters'
}
function TestPasscodeSuite(v: string): string | undefined {
    if (v.length === 0) return 'Required Field'
    if (!/^([0-9]{6}|[0-9ABCDEF]{8})$/.test(v)) return 'Invalid or Malformed Passcode'
}

/** Set **disabled** attribute to all DOM elements with the **dynamic** attribute */
function SetDynamic(enabled: boolean) {
    document.querySelectorAll('*[dynamic]').forEach(e => {
        enabled
            ? e.removeAttribute('disabled')
            : e.setAttribute('disabled', 'true')
    })
}

/** Follow Redirect using the **redirect** param in url */
function FollowRedirect(defaultPath: string) {
    const search = new URLSearchParams(document.location.href.split('?').at(1) || '')
    const redirect = search.get('redirect') || defaultPath
    try {
        // Follow Given URL only if whitelisted
        const url = new URL(redirect)
        window.location.assign(
            url.host.endsWith('suzzygames.com')
                ? redirect
                : defaultPath
        )
    } catch (err) {
        // Expect a Redirect that begins with a forward slash
        window.location.assign(
            redirect.startsWith('/')
                ? redirect
                : defaultPath
        )
    }
}

/** Generate an URL to a User Avatar/banner or Application Icon */
function ImageURL(
    folder: 'avatars' | 'banners' | 'icons',
    id: number,
    hash: string | null,
    animated: boolean,
    size: 'small' | 'medium' | 'large'
) {
    // Use Default avatars/icons otherwise fetch from CDN
    return hash === null
        ? '/assets/images/' + (folder === 'avatars' ? `default-user${(id % 6)}.png` : 'default-icon.png')
        : ENV_URLS.cdn + `/${folder}/${id}/${hash}/${animated && hash.startsWith('a_') ? 'gif' : 'webp'}/${size}`
}

interface ApiResponse<BodyType> {
    success: boolean        // Request Sucessful?
    error?: Error           // Request Error (if any)
    ok: boolean             // Status Code ranges between 200-299
    code: number            // HTTP Response Code
    body: string            // HTTP Response Body
    json: BodyType          // HTTP Response Body parsed as JSON
}
function CallAPI<T>(
    method: string,
    path: string,
    authorization: 'mfa' | 'basic' | 'public',
    withBody?: Record<string, any>
): Promise<ApiResponse<T>> {
    return new Promise(ok => {

        // Send HTTP Request
        let body: string | undefined
        let result: ApiResponse<T>
        let headers = new Headers()
        let credentials: RequestCredentials = (authorization === 'public' ? 'omit' : 'include')
        if (authorization === 'mfa') {

            // Check for MFA Token

            throw 'mfa not implemented'
        }
        if (withBody !== undefined) {
            headers.set('content-type', 'application/json')
            body = JSON.stringify(withBody)
        }

        fetch(ENV_URLS.api + path, { method, body, headers, credentials })
            .then(async resp => {
                let json: any = undefined
                const text = await resp.text()
                try { json = JSON.parse(text) } catch (e) { }
                result = {
                    'success': true,
                    'error': undefined,
                    'ok': resp.ok,
                    'code': resp.status,
                    'body': text,
                    'json': json,
                }
            })
            .catch(error => {
                result = {
                    success: false,
                    error,
                    ok: false,
                    code: -1,
                    body: '',
                    json: undefined as any
                }
            })
            .finally(() => {
                console.log(`[HTTP] ${method} ${path} (Auth: ${authorization}) (Body: ${body?.length || 0}B)`, result)
                ok(result)
            })
    })
}

/** Creates a modal window */
function CreateModal<T>(views: ModalView[]) {
    return new Promise<T>((modalClose, modalCancel) => {
        let currentView = 0

        /** Helper: Create Element with Classes and Parent */
        function _Create<T = HTMLElement>(tagName: string, classes: string, parent: HTMLElement) {
            const elem = document.createElement(tagName)
            elem.classList.add(...classes.split(',').filter(c => c.length))
            parent.appendChild(elem)
            return elem as T
        }
        function _Close() {
            SetDynamic(true)
            modalWrapper.style.opacity = '0'
            setTimeout(() => modalWrapper.remove(), 200)
        }

        /** Scroll to desired view index */
        function SetActiveView(viewIndex: number) {
            const targetView = modalViews[viewIndex]
            if (targetView) {
                modalViews.forEach(({ wrapper }, i) =>
                    wrapper.style.height = (viewIndex === i)
                        ? `${targetView.wrapper.scrollHeight}px`
                        : '0'
                )
                modalContainer.scrollLeft = (viewIndex * 600)
                currentView = viewIndex
                SetCanInteract(true)
            }
        }

        /** Enable/Disable Modal Interaction */
        function SetCanInteract(canInteract: boolean) {
            function Enabled(elem: Element, value: boolean) {
                value
                    ? elem.removeAttribute('disabled')
                    : elem.setAttribute('disabled', 'true')
            }
            modalViews.forEach((v, i) => {
                const newValue = (i === currentView) ? canInteract : false
                for (const e of v.elements.children) {
                    if (e.tagName === 'A') e.setAttribute('tabindex', '0')
                    if (e.tagName === 'INPUT') Enabled(e, newValue)
                }
                if (v.submit) Enabled(v.submit, newValue)
                if (v.cancel) Enabled(v.cancel, newValue)
            })
        }

        const modalWrapper = _Create('div', 'modal-wrapper', document.body)
        const modalContainer = _Create('div', 'modal-content,special-shadow', modalWrapper)
        const modalViews = views.map(o => {
            const wrapper = _Create('div', 'modal-view', modalContainer)
            const elements = _Create('div', 'modal-elements', wrapper)
            _Create('div', 'modal-divider', wrapper)
            const footer = _Create('div', 'modal-footer', wrapper)

            // Create Elements
            for (const [key, value] of Object.entries(o.elements || {})) {
                switch (value.type) {
                    // Static Elements
                    case 'headline':
                        _Create('p', 'modal-headline', elements).textContent = value.label
                        break
                    case 'header':
                        _Create('p', 'modal-header', elements).textContent = value.label
                        break
                    case 'divider':
                        _Create('div', 'modal-divider', elements)
                        break
                    case 'spacer':
                        _Create('div', 'modal-spacer', elements)
                        break
                    case 'link':
                        const a = _Create<HTMLAnchorElement>('a', 'modal-link', elements)
                        a.textContent = value.label
                        a.href = value.href
                        a.tabIndex = -1
                        break
                    case 'text':
                        _Create('p', 'modal-text', elements).textContent = value.label
                        break

                    // Interactive Elements
                    case 'input':
                        const label = _Create<HTMLLabelElement>('label', 'modal-label', elements)
                        const input = _Create<HTMLInputElement>('input', 'modal-input', elements)
                        label.textContent = value.label
                        label.title = value.label
                        label.htmlFor = key
                        input.type = value.inputType
                        input.id = key
                        input.disabled = true
                        break

                    // Unique Elements
                    case 'unique-links':
                        const linkWrapper = _Create('div', 'modal-flex', elements)
                        for (const e of value.text.split(';')) {
                            const [text, url] = e.split(':', 2)
                            if (url) {
                                const a = _Create<HTMLAnchorElement>('a', 'modal-link', linkWrapper)
                                a.textContent = text
                                a.target = '_blank'
                                a.href = url
                            } else {
                                _Create('p', 'modal-link', linkWrapper).textContent = text
                            }
                        }
                        break
                }
            }

            // Create Footer Elements
            let submit: HTMLButtonElement | undefined
            let cancel: HTMLButtonElement | undefined
            let alert = _Create<HTMLParagraphElement>('p', 'modal-alert', footer)
            if (o.closeLabel) {
                cancel = _Create<HTMLButtonElement>('button', 'default', footer)
                cancel.textContent = o.closeLabel
                cancel.disabled = true
                cancel.onclick = async () => {
                    if (o.closeLogic) await o.closeLogic()
                    modalCancel('User Closed Modal' as any)
                    _Close()
                }
            }
            if (o.submitLabel) {
                submit = _Create<HTMLButtonElement>('button', 'default', footer)
                submit.textContent = o.submitLabel
                submit.disabled = true
                submit.onclick = async () => {
                    if (o.submitLogic) {
                        // Collect Inputs
                        const view = modalViews[currentView]
                        const values: Record<string, string> = {}
                        for (const e of view.elements.children) {
                            if (e instanceof HTMLInputElement) {
                                values[e.id] = e.value
                                continue
                            }
                        }
                        // Run Logic
                        SetCanInteract(false)
                        o.submitLogic({ SetCanInteract, SetActiveView }, values)
                            .then(results => {

                                // Reset Errors and Create Index for Label Elements
                                view.alert.textContent = ''
                                const labels: Record<string, HTMLLabelElement> = {}
                                for (const e of view.elements.children) {
                                    if (e instanceof HTMLLabelElement) {
                                        labels[e.getAttribute('for')!] = e
                                        e.textContent = e.title
                                        e.removeAttribute('error')
                                    }
                                }

                                // Complete Promise and Return Results
                                if (results.success) {
                                    modalClose(results.values as T)
                                    _Close()
                                    return
                                }
                                if (results.messages) {
                                    if (typeof results.messages === 'string') {
                                        // Show Basic Alert
                                        view.alert.textContent = results.messages
                                    } else {
                                        // Show Rich Error(s)
                                        for (const [id, label] of Object.entries(labels)) {
                                            const message = results.messages[id]
                                            if (message) {
                                                label.textContent = `${label.title} - ${message || 'No Error Message Provided'}`
                                                label.setAttribute('error', 'true')
                                            }
                                        }
                                    }
                                }
                            })
                            .catch(error => {
                                // Set Error
                                view.alert.textContent = `Script Error: ${error}`
                                console.error('[MODAL] Script error', error)
                            })
                            .finally(() => SetCanInteract(true))
                    }
                }
            }

            return { wrapper, elements, footer, submit, cancel, alert }
        })

        // A little silly but heights and offsets break until everything (AND I MEAN EVERYTHING)
        // has loaded in completely and browser has rendered the first frame
        requestIdleCallback(() => {
            requestAnimationFrame(() => {
                modalWrapper.style.opacity = '1'    // Fade in Modal
                SetDynamic(false)                   // Disable all Interactable Elements
                SetActiveView(currentView)          // Initialize View
            })
        })

    })
}

/** Simpler method of creating modals for quick messages */
function CreateMessage(
    title: ElementHeader['label'],
    message: ElementText['label'],
    buttonLabel: ModalView['closeLabel'],
    buttonLogic: ModalView['closeLogic']
) {
    return CreateModal([{
        'closeLabel': buttonLabel,
        'closeLogic': buttonLogic,
        'submitLogic': async () => { return { success: true } },
        'elements': {
            'title': { type: 'header', label: title },
            'message': { type: 'text', label: message }
        }
    }])
}

interface ModalState {
    SetActiveView: (viewIndex: number) => void
    SetCanInteract: (canInteract: boolean) => void
}
interface ModalResults {
    success: boolean                                            // Submit Success
    values?: Record<string, any>                                // Submit Results
    messages?: Record<string, string | undefined> | string      // Submit Error
}
interface ModalView {
    submitLabel?: string
    submitLogic?: (modal: ModalState, values: Record<string, string>) => Promise<ModalResults>
    closeLabel?: string
    closeLogic?: () => void
    elements?: { [key: string]: ModalElement }
}
type ModalElement =
    ElementHeader |
    ElementHeadline |
    ElementDivider |
    ElementSpacer |
    ElementText |
    ElementInput |
    ElementLink |
    ElementUniqueLinks

interface ElementBase {
    type: string
}
interface ElementHeader extends ElementBase {
    type: 'header'
    label: string
}
interface ElementHeadline extends ElementBase {
    type: 'headline'
    label: string
}
interface ElementDivider extends ElementBase {
    type: 'divider'
}
interface ElementSpacer extends ElementBase {
    type: 'spacer'
}
interface ElementText extends ElementBase {
    type: 'text'
    label: string
}
interface ElementInput extends ElementBase {
    type: 'input'
    inputType: string
    label: string
}
interface ElementLink {
    type: 'link';
    label: string;
    href: string;
}
interface ElementUniqueLinks {
    type: 'unique-links'
    text: string;
}