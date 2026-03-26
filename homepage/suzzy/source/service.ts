import { PROCESSOR_ASSETS, PROCESSOR_INDEX, PROCESSOR_PREFIX, PRODUCTION, WEB_ADDR, WEB_PORT } from './constants'
import { Empty, Redirect, Static } from './functions/serveFunctions'
import { processFile } from './functions/processFile'
import { Articles } from './class/articles'
import Log from './functions/logger'
import express from 'express'

// todo: implement gzip compression

(async () => {
    const blog = new Articles('blog', '/blog')
    const library = new Articles('library', '/library')
    const app = express()
    app.disable('x-powered-by')
    app.disable('etag')

    // Dynamic Routes
    app.get(['/blog', '/blog/:cat', '/blog/:cat/:opt'], blog.serveContent)
    app.get(['/library/:cat', '/library/:cat/:opt'], library.serveContent)
    app.get('/library/snippet', library.serveSnippet)
    app.get('/library*', Redirect('/library/home/welcome'))

    // Static Routes
    app.get('/', await Static('views/public/index.pug'))
    app.get('/projects', await Static('views/public/projects.pug'))
    app.get('/login', await Static('views/public/login.pug'))
    app.get('/signup', await Static('views/public/signup.pug'))
    app.get('/password-reset', await Static('views/public/password-reset.pug'))
    app.get('/password-update', await Static('views/public/password-update.pug'))
    app.get('/verify-email', await Static('views/public/verify-email.pug'))
    app.get('/verify-login', await Static('views/public/verify-login.pug'))
    app.get('/challenge-picross', await Static('views/public/challenge-picross.pug'))

    // app.get('/profile', await Static('views/profile/index.pug'))
    // app.get('/profile/devices', await Static('views/profile/devices.pug'))
    // app.get('/profile/security', await Static('views/profile/security.pug'))
    // app.get('/profile/applications', await Static('views/profile/applications.pug'))
    // app.get('/profile/connections', await Static('views/profile/connections.pug'))
    // app.get('/profile*', Redirect('/profile'))
    app.get('/assets*', async (req, res) => {
        const index = PROCESSOR_INDEX[req.originalUrl]
        if (index === undefined) {
            res.status(404).end()
            return
        }
        const asset = PROCESSOR_ASSETS[index]
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('Content-Type', asset.type)
        res.setHeader('Content-Length', asset.size)
        res.end(asset.file)
    })

    if (!PRODUCTION) {
        app.get('/asset-processor*', async (req, res) => {
            processFile('file://' + req.originalUrl.slice('/asset-processor/'.length))
                .then(uri => {
                    const asset = PROCESSOR_ASSETS[PROCESSOR_INDEX[uri]]
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
                    res.setHeader('Content-Type', asset.type)
                    res.setHeader('Content-Length', asset.size)
                    res.end(asset.file)
                })
                .catch(e => {
                    res.status(500)
                    res.end(`Caught Processor Error!\n${String(e)}`)
                })
        })
    }

    app.get('*', await Static('views/404.pug'))
    app.use(Empty(404))

    app.listen(WEB_PORT, WEB_ADDR, () => {
        Log('INFO', 'http', `Server Listening @ ${WEB_ADDR}:${WEB_PORT}`)
    })

    // Array of items not referenced but required!
    const INCLUDES = new Array<string>(
        // scripts/shared-utils.ts
        'file://images/default-icon.png',
        'file://images/default-user0.png',
        'file://images/default-user1.png',
        'file://images/default-user2.png',
        'file://images/default-user3.png',
        'file://images/default-user4.png',
        'file://images/default-user5.png',

        // scripts/shared-utils.ts
        'file://icons/badge-crown.svg',
        'file://icons/badge-star.svg',
        'file://icons/badge-picross.svg',

        // scripts/template-article.ts
        'file://icons/icon-play.svg',
        'file://icons/icon-pause.svg',

        // todo: Email Directory
    )
    for (const uri of INCLUDES) {
        processFile(uri)
    }

})()
