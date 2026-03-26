import { byteSize, calcReadTime, formatDate, formatHref } from "./pugHelpers"
import { PROCESSOR_PREFIX, PRODUCTION } from "../constants"
import { processFile } from "./processFile"
import parse from "node-html-parser"
import pug from 'pug'

const replaceAttr = new Array<string>('src', 'href', 'content', 'poster')
const replaceQuery = new Array<string>(
    'img[src]',         // Image Elements
    'source[src]',      // Video Sources
    'audio[src]',       // Audio Sources
    'script[src]',      // Script Elements
    'link[href]',       // CSS Links
    'meta[content]',    // Meta OG Tags
    'a[href]',          // Download Anchors
    'video[poster]',    // Video Posters
).join(',')

// Render a View and Process all Files
export default async function processView(path: string, locals: any): Promise<string> {
    const document = parse(
        pug.renderFile(path, Object.assign(locals, {
            'pretty': !PRODUCTION,
            'formatBytes': byteSize,
            'formatDate': formatDate,
            'formatString': formatHref,
            'calcReadTime': calcReadTime,
        })),
        { comment: true }
    )

    // Process Inline Styles
    for await (const elem of document.querySelectorAll('*[style]')) {
        let css = elem.getAttribute('style')
        if (!css) continue
        const search = /('file:\/\/[^']+')/g
        const promises = new Array<ReturnType<typeof processFile>>()
        css.replaceAll(search, uri => {
            promises.push(processFile(uri.slice(1, -1), !PRODUCTION))
            return uri
        })
        await Promise.all(promises).then(results => {
            let index = 0
            css = css!.replaceAll(search, () => results[index++])
        })
        elem.setAttribute('style', css)
    }

    // Process Element Sources
    for (const elem of document.querySelectorAll(replaceQuery)) {
        const attrKey = replaceAttr.find(e => elem.getAttribute(e))
        if (!attrKey) continue
        const attrVal = elem.getAttribute(attrKey)
        if (attrVal && attrVal.startsWith(PROCESSOR_PREFIX)) {
            elem.setAttribute(attrKey, await processFile(attrVal, !PRODUCTION))
        }
    }

    return document.toString()
}