import { Request, RequestHandler, Response } from 'express'
import { PRODUCTION } from '../constants'
import { createHash } from 'crypto'
import processView from './processView'
import Log from './logger'

// Renders a View from Disk and Serves it with Caching Enabled
export async function Static(path: string): Promise<RequestHandler> {
    if (PRODUCTION) {
        Log('INFO', 'static', `Pre-Render: '${path}'`)
        const content = await processView(path, {})
        const length = Buffer.byteLength(content)
        const hash = createHash('md5').update(content).digest('hex')

        return function (req: Request, res: Response) {
            if (req.headers['if-none-match'] === hash) {
                res.status(304).end()
                return
            }
            res.setHeader('Content-Type', 'text/html')
            res.setHeader('Content-Length', length)
            res.setHeader('ETag', hash)
            res.end(content)
        }
    } else {
        return async function (req: Request, res: Response) {
            Log('INFO', 'static', `Render: '${path}'`)
            processView(path, {})
                .then(html => res.send(html))
                .catch(err => res
                    .status(500)
                    .end('Caught Rendering Error! Check Console for more details.\n' + String(err))
                )
        }
    }

}

// Redirect to Another Location
export function Redirect(location: string) {
    return function (req: Request, res: Response) {
        res.redirect(location)
    }
}

// Return a Response Code with an Empty Body
export function Empty(status: number) {
    return function (req: Request, res: Response) {
        res.status(status).end()
    }
}