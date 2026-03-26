import { RawAttributes } from 'node-html-parser/dist/nodes/html'
import { Element, TableElement } from '../types/articles'
import { parse } from 'node-html-parser'
import hljs from "highlight.js"
import { inspect } from 'util'

/** Parses and extracts elements from an Article */
export default function parseArticle(someDocument: string): [RawAttributes, Array<Element>] {
    const clean = (s: string) => s.split('\n').map(s => s.trim()).join(' ').trim()
    const root = parse(someDocument, {}).querySelector('article')
    const data = new Array<Element>()
    if (!root || root.tagName !== 'ARTICLE') {
        throw 'Expected Article Tag'
    }
    for (const tag of root.childNodes) {
        const tagName = tag.rawTagName.trim().toLowerCase()
        // @ts-expect-error
        const element = tag as HTMLElement

        switch (tagName) {

            case 'quote':
            case 'header':
            case 'subheader':
                data.push({
                    'type': tagName,
                    'value': tag.textContent
                })
                break

            case 'text':
                data.push({
                    'type': 'text',
                    'items': (
                        tag.childNodes.map(child => {
                            const data: Record<string, string> = {}
                            if (child.rawTagName === 'a') {
                                // @ts-expect-error
                                const c = child as HTMLElement
                                data.href = c.getAttribute('href')!
                                data.target = c.getAttribute('target')!
                            }
                            return Object.assign(data, {
                                'tag': child.rawTagName,
                                'content': clean(child.textContent),
                            })
                        })
                            .filter(c => c.content.length !== 0)
                    )
                })
                break

            case 'code':
                const code = tag.textContent.trim()
                const syntax = element.getAttribute('syntax')!
                data.push({
                    'type': 'code',
                    'content': (
                        syntax !== 'skip'
                            ? hljs.highlight(code, { 'language': syntax }).value
                            : code
                    )
                })
                break

            case 'list':
                data.push({
                    'type': 'list',
                    'items': (
                        tag.childNodes
                            .map(c => clean(c.textContent))
                            .filter(e => e.length !== 0)
                    )
                })
                break

            case 'table':
                const table: TableElement = {
                    type: 'table',
                    items: []
                }
                for (const row of tag.childNodes) {
                    const items = new Array<string>()
                    if (row.rawTagName !== 'row') continue
                    for (const column of row.childNodes) {
                        if (column.rawTagName !== 'column') continue
                        items.push(clean(column.textContent))
                    }
                    table.items.push(items)
                }
                data.push(table)
                break

            case 'image':
            case 'banner':
            case 'beanie':
                data.push({
                    'type': tagName,
                    'resource': element.getAttribute('resource')!,
                    'caption': element.getAttribute('caption')!,
                    'alt': element.getAttribute('alt')!,
                })
                break

            case 'video':
                data.push({
                    'type': tagName,
                    'resource': element.getAttribute('resource')!,
                    'caption': element.getAttribute('caption')!,
                    'alt': element.getAttribute('alt')!,
                    'cover': element.getAttribute('cover')!,
                })
                break

            case 'audio':
                data.push({
                    'type': tagName,
                    'resource': element.getAttribute('resource')!,
                    'name': element.getAttribute('name')!,
                })
                break

            case '': break
            default:
                throw `Unsupported Tag Name '${tagName}'`
        }
    }
    return [
        root.rawAttributes,
        data
    ]
}