import { CONTENT_TYPE_MAP, PROCESSOR_ASSETS, PROCESSOR_DIRECT, PROCESSOR_INDEX, PROCESSOR_PREFIX, PROCESSOR_PRESETS, PRODUCTION } from '../constants'
import { existsSync, readFileSync } from 'fs'
import { extname, join } from 'path'
import { createHash } from 'crypto'
import cleanCss from 'clean-css'
import * as js from 'uglify-js'
import * as ts from 'typescript'
import sharp from 'sharp'
import Log from './logger'
import { byteSize } from './pugHelpers'

const PROCCESED = new Map()

// Background processes a file making it available at the returned path
export function processFile(uri: string, dry = false) {
    return new Promise<string>(async (ok, cancel) => {
        if (!uri.startsWith(PROCESSOR_PREFIX)) {
            cancel(`URI '${uri}' must begin with ${PROCESSOR_PREFIX}`)
            return
        }
        if (dry) {
            ok(`/asset-processor/${uri.slice(PROCESSOR_PREFIX.length)}`)
            return
        }
        if (PRODUCTION && PROCCESED.has(uri)) {
            return ok(PROCCESED.get(uri))
        }

        // Read Contents From Disk
        const t = Date.now()
        const [pathname, search] = uri.slice(PROCESSOR_PREFIX.length).split('?', 2)
        const params = new URLSearchParams(search)
        const path = join(process.cwd(), 'assets', pathname)
        if (!existsSync(path)) {
            cancel(`Path '${path}' does not exist`)
            return
        }
        const input = readFileSync(path)
        const extension = extname(pathname).slice(1)

        function complete(ext: string, output: string | Buffer) {
            const outHash = createHash('md5').update(output).digest('hex').slice(0, 8)
            const uriPath =
                (params.get('direct') ? PROCESSOR_DIRECT : '') +
                `/assets/${pathname.slice(0, pathname.length - extension.length)}${ext}`
            const uriFull = `${uriPath}?v=${outHash}`
            const index = PROCESSOR_ASSETS.push({
                'type': CONTENT_TYPE_MAP[ext] || 'application/octet-stream',
                'size': Buffer.byteLength(output),
                'file': output,
            }) - 1
            PROCESSOR_INDEX[uriPath] = index
            PROCESSOR_INDEX[uriFull] = index
            PROCCESED.set(uri, uriFull)
            Log('DEBUG', 'processFile', `'${uriFull}' (${byteSize(output.length)}) (${Date.now() - t}ms)`)
            ok(uriFull)
        }
        switch (extension) {

            // Resize Image
            case 'webp':
            case 'jpeg':
            case 'jpg':
            case 'png':
            case 'gif': {
                const preset = PROCESSOR_PRESETS[params.get('preset') || '']
                const animated = params.get('animated') !== null
                complete(
                    preset ? preset.format : extension,
                    preset ? await sharp(input, { animated })
                        .resize(preset.width, preset.height, preset.resize)
                        .toFormat(preset.format, { 'quality': preset.quality })
                        .toBuffer()
                        : input
                )
                break
            }

            // Minify Script
            case 'js': {
                const minified = js.minify(input.toString(), { mangle: true })
                if (minified.error) {
                    cancel(`JavaScript Minify Error: ${minified.error}`)
                    return
                }
                complete('js', minified.code)
                break
            }

            // Transpile and Minify Script
            case 'ts': {
                const script = ts.transpile(input.toString(), {
                    'target': ts.ScriptTarget.ES2022,
                    'module': ts.ModuleKind.CommonJS,
                    'lib': ['DOM', 'ES2022'],
                    'allowSyntheticDefaultImports': true,
                    'skipLibCheck': true,
                    'strict': true,
                })
                const minified = js.minify(script, { mangle: true })
                if (minified.error) {
                    cancel(`JavaScript Minify Error: ${minified.error}`)
                    return
                }
                complete('js', minified.code)
                break
            }

            // Minify Styles
            case 'css': {
                const css = input.toString()
                const search = /('file:\/\/[^']+')/g
                const promises = new Array<ReturnType<typeof processFile>>()

                // Search for URIs inside CSS File
                css.replaceAll(search, uri => {
                    promises.push(processFile(uri.slice(1, -1), !PRODUCTION))
                    return uri
                })
                Promise.all(promises).then(results => {
                    // Replace all URIs and Minify
                    let index = 0
                    const minifed = new cleanCss().minify(
                        css.replaceAll(search, () => results[index++])
                    )
                    if (minifed.errors.length) {
                        cancel(`Minify CSS Error: ${minifed.errors.join(', ')}`)
                        return
                    }
                    complete('css', minifed.styles)

                }).catch(e => {
                    cancel(`CSS Processing Errors: ${e}`)
                })
                break
            }

            // Unsupported, Skip Processing!
            default:
                complete(extension, input)
                break
        }
    })
}

