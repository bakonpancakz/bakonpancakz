import { Locals, Manifest, ManifestArticle, ManifestEntry } from '../types/articles'
import { PRODUCTION } from '../constants'
import parseArticle from '../functions/parseArticle'
import processView from '../functions/processView'
import Log from '../functions/logger'

import { existsSync, readFileSync, watch } from 'fs'
import { Request, Response } from 'express'
import { createHash } from 'crypto'
import { join } from 'path'

type ArticleID = number
type ElementID = number
type WordID = number
const stripSpaces = (t: string) => t.replaceAll(/[\s]{2,}/gm, ' ').trim()
const stripSpecial = (t: string) => t.replaceAll(/[^a-z0-9_-\s]/gm, ' ')
const difference = (a: string, b: string): number => {
    let match = b.length
    if (Math.abs(a.length - b.length) < 2) {
        for (const i in b.split('')) {
            if (a[i] === b[i]) match--
        }
    }
    return match
}

export class Articles {
    private path: string
    private directory: string
    private articles = new Array<ManifestArticle>()
    private categories = new Array<ManifestEntry>()
    private authors = new Array<ManifestEntry>()
    private indexWord: Record<string, Array<[ArticleID, ElementID, WordID]>> = {}
    private indexData = new Array<Array<Array<string>>>(
        // Article > Elements > Words
    )
    private views: Record<string, {
        hash: string;           // Document Hash for Caching
        size: number;           // Document Size
        content: string;        // Document Content
    }> = {}

    constructor(folder: string, path: string) {
        this.directory = join('views', folder)
        this.path = path
        if (!PRODUCTION) {
            Log('DEBUG', 'Articles', `${this.directory}: Watching Directory`)
            let timeout: ReturnType<typeof setTimeout>
            let callback = () => {
                Log('INFO', 'Articles', `${this.directory}: Changes Detected, Reloading...`)
                this.reload().catch(e => {
                    Log('ERROR', 'Articles', `${this.directory}: Reload Error Caught`, e)
                })
            }
            watch(this.directory, { recursive: true }, () => {
                clearTimeout(timeout)
                timeout = setTimeout(() => callback(), 10)
            })
        }
        this.reload()
    }

    private async reload() {
        this.authors = []
        this.articles = []
        this.categories = []
        this.indexData = []
        this.indexWord = {}

        // Validate Folder Structure
        if (!existsSync(join(this.directory, 'browser.pug')))
            throw `${this.directory}: File 'browser.pug' is required`
        if (!existsSync(join(this.directory, 'post.pug')))
            throw `${this.directory}: File 'post.pug' is required`
        if (!existsSync(join(this.directory, 'manifest.json')))
            throw `${this.directory}: File 'manifest.json' is required`
        if (!existsSync(join(this.directory, 'articles')))
            throw `${this.directory}: Folder 'articles' is required`

        // Read and Parse Manifest
        let manifest!: Manifest
        try {
            const data = readFileSync(join(this.directory, 'manifest.json'), 'utf8')
            manifest = JSON.parse(data)

            if (!Array.isArray(manifest.categories))
                throw `Field 'categories' must be an array`
            if (!Array.isArray(manifest.authors))
                throw `Field 'authors' must be an array`
            if (!Array.isArray(manifest.articles))
                throw `Field 'articles' must be an array`
            if (manifest.itemsPerPage !== undefined && typeof manifest.itemsPerPage !== 'number')
                throw `Field 'itemsPerPage' must be a number`
            if (manifest.noBrowser !== undefined && typeof manifest.noBrowser !== 'boolean')
                throw `Field 'noBrowser' must be a boolean`

            let i = 0
            for (const item of manifest['articles']) {
                if (typeof item !== 'string')
                    throw `${i}: Must of 'string' type`
                i++
            }
            i = 0

            for (const field of [manifest['categories'], manifest['authors']]) {
                let m: Record<string, number> = {}
                for (const item of field) {
                    if (item.id === undefined)
                        throw `${i}: Missing field 'id'`
                    if (item.icon === undefined)
                        throw `${i}: Missing field 'icon'`
                    if (item.name === undefined)
                        throw `${i}: Missing field 'name'`
                    if (m[item.id])
                        throw `${i}: Duplicate ID with index ${m[item.id]}`
                    i++
                }
            }
            this.categories = manifest['categories']
            this.authors = manifest['authors']
        } catch (e) {
            throw `${this.directory}: Unable to Parse Manifest (${e})`
        }

        // Read and Parse Articles
        for (const filepath of manifest.articles) {
            try {
                const path = join(this.directory, 'articles', filepath)
                const file = readFileSync(path, 'utf8')
                const [attributes, elements] = parseArticle(file)
                for (const field of [
                    'id', 'created', 'categoryId', 'authorId',
                    'title', 'snippet', 'banner', 'noindex'
                ]) {
                    if (attributes[field] === undefined)
                        throw `Attribute '${field}' must be initialized`
                }
                const author = this.authors.find(c => c.id === attributes.authorId)
                if (!author) {
                    throw `Author ID is invalid`
                }
                const category = this.categories.find(c => c.id === attributes.categoryId)
                if (!category) {
                    throw `Category ID is invalid`
                }
                this.articles.push({
                    'info': {
                        'id': attributes.id,
                        'created': attributes.created,
                        'categoryId': attributes.categoryId,
                        'authorId': attributes.authorId,
                        'title': attributes.title,
                        'snippet': attributes.snippet,
                        'banner': attributes.banner,
                        'noindex': attributes.noindex,
                    },
                    'author': author,
                    'category': category,
                    'elements': elements,
                    'path': path,
                })
            } catch (e) {
                throw `${this.directory}: Unable to Parse Article '${filepath}' (${e})`
            }
        }
        this.articles.sort((a, b) =>
            new Date(b.info.created).getTime() -
            new Date(a.info.created).getTime()
        )

        // Generate Article Indexes
        this.articles.forEach((article, articleIndex) => {
            if (article.info.noindex === 'true') return

            const textElements = article.elements.map(e => {
                switch (e.type) {
                    case 'header':
                    case 'subheader': return e.value
                    case 'text': return e.items.map(e => e.content).join(' ')
                    case 'list': return e.items.join(' , ')
                    case 'quote': return e.value
                    case 'audio': return `[AUDIO]`
                    case 'image': return `[IMAGE]`
                    case 'banner': return `[BANNER]`
                    case 'beanie': return `[BEANIE]`
                    case 'video': return `[VIDEO]`
                    case 'code': return `[CODE]`
                    case 'table': return `[TABLE]`
                }
            })

            this.indexData.push(
                textElements.map((element, elementIndex) => {
                    const words = stripSpaces(element).split(' ')
                    words.forEach((word, wordIndex) => {
                        word = word.toLowerCase()

                        // Add Entire Word to Index
                        if (!this.indexWord[word]) this.indexWord[word] = []
                        this.indexWord[word].push([
                            articleIndex,
                            elementIndex,
                            wordIndex,
                        ])
                        console.log(word)

                        // Remove Special Characters and Split Word
                        const subwords = stripSpaces(stripSpecial(word)).split(' ')
                        console.log(subwords)
                        subwords.forEach(subword => {
                            subword = subword.toLowerCase()
                            if (!this.indexWord[subword]) this.indexWord[subword] = []
                            this.indexWord[subword].push([
                                articleIndex,
                                elementIndex,
                                wordIndex,
                            ])
                        })

                    })
                    return words
                })
            )
        })

        {
            const T = performance.now()
            const searchQuery = 'Get Widgets'
            const searchWords = stripSpaces(searchQuery.trim().toLowerCase()).split(' ', 16)

            // Find Starting Words
            const sapling = new Array<string>()
            for (const word of Object.keys(this.indexWord)) {
                if (difference(word, searchWords[0]) < 2) {
                    sapling.push(word)
                }
            }
            // Traverse Words
            console.log(sapling)
            for (const index of sapling) {
                for (const branch of this.indexWord[index]) {

                    console.log(index, branch)
                }
            }

            console.log('processing time:', performance.now() - T)
        }

        // Pre-Render all Browser Pages
        if (!manifest.itemsPerPage) manifest.itemsPerPage = 8
        if (!manifest.noBrowser) {

            // Add undefined so we can generate an 'all' category
            for (const index in [undefined, ...this.categories]) {

                const category = this.categories[index]
                const relevantArticles = this.articles.filter(a => !category || a.category.id === category.id)
                const pageTotal = Math.ceil(relevantArticles.length / manifest.itemsPerPage) || 1

                for (let pageIndex = 1; pageIndex < pageTotal + 1; pageIndex++) {
                    try {
                        const l: Locals = {
                            'articles': this.articles,
                            'relevantArticle': undefined,
                            'relevantArticles': relevantArticles,
                            'relevantCategory': category,
                            'authors': this.authors,
                            'categories': this.categories,
                            'pageCurrent': pageIndex,
                            'pageOffset': (pageIndex - 1) * manifest.itemsPerPage,
                            'pageIndex': pageIndex,
                            'pageTotal': pageTotal,
                        }
                        l.relevantArticles = l.relevantArticles.slice(
                            l.pageOffset,
                            l.pageOffset + manifest.itemsPerPage
                        )

                        const document = await processView(join(this.directory, 'browser.pug'), l)
                        const view = {
                            'content': document,
                            'size': Buffer.byteLength(document),
                            'hash': createHash('md5').update(document).digest('hex'),
                        }
                        const path = (category ? `${this.path}/${category.id}` : `${this.path}`)
                        if (pageIndex === 1) this.views[path] = view
                        this.views[`${path}/${pageIndex}`] = view

                    } catch (e) {
                        throw `Render Error: '${category?.id || 'all'}/${pageIndex}' (${e})`
                    }
                }
            }
        }

        // Pre-Render all Article Pages
        for (const article of this.articles) {
            try {
                const l: Locals = {
                    'articles': this.articles,
                    'relevantArticle': article,
                    'relevantArticles': [],
                    'relevantCategory': article.category,
                    'authors': manifest.authors,
                    'categories': manifest.categories,
                    'pageIndex': -1,
                    'pageOffset': -1,
                    'pageTotal': -1,
                    'pageCurrent': -1,
                }
                const document = await processView(join(this.directory, 'post.pug'), l)
                this.views[`${this.path}/${article.category.id}/${article.info.id}`] = {
                    'content': document,
                    'size': Buffer.byteLength(document),
                    'hash': createHash('md5').update(document).digest('hex'),
                }
            } catch (e) {
                throw `Render Error: '${article.category.id}/${article.info.id}' (${e})`
            }
        }

    }

    // Serve a Browser Request with path (Paths: '/my-articles', '/my-articles/:cat', '/my-articles/:cat/:opt')
    public serveContent = this._serveContent.bind(this)
    private _serveContent(req: Request, res: Response) {
        let key = this.path
        if (req.params['cat']) key += `/${req.params['cat']}`
        if (req.params['opt']) key += `/${req.params['opt']}`
        const view = this.views[key]
        if (view) {
            if (req.headers['if-none-match'] === view.hash) {
                res.status(304).end()
            } else {
                res.setHeader('Content-Type', 'text/html')
                res.setHeader('Content-Length', view.size)
                res.setHeader('Etag', view.hash)
                res.end(view.content)
            }
            return
        }
        // Continue to 404 Handler
        if (req.next) req.next()
    }

    // Search for Snippet of text in all article (Path: '/my-articles/snippet')
    public serveSnippet = this._serveSnippet.bind(this)
    private _serveSnippet(req: Request, res: Response) {
        res.end('todo')
    }
}



// // Parse Search Query
// // const Query = (key: string): string => (typeof req.query[key] === 'string' ? req.query[key] : '')
// const search = Query('query') || Query('q')
// if (!search) {
//     res.json([])
//     return
// }

// // Find First Word
// const query = this.formatSnippet(search, 12)
// if (!query.length) {
//     res.json([])
//     return
// }
// const matches = this.indexWords[query[0]]
// if (!matches) {
//     res.json([])
//     return
// }

// // Generate Results
// const results = new Array<{
//     score: number
//     link: string
//     snippet: string
//     location: string
// }>()
// for (const { wordIndex: wi, articleIndex: ai, elementIndex: ei } of matches) {
//     const a = this.articles[ai]
//     const e = a.elements[ei] as HeaderElement | SubheaderElement
//     let score = 0, o = 0
//     let matchWords = new Array<string>()
//     for (const queryWord of query) {
//         const articleWord = a.words[wi + o]
//         if (!articleWord) break
//         if (queryWord === this.formatWord(articleWord)) {
//             score++
//             matchWords.push(articleWord)
//         } else {
//             break
//         }
//         o++
//     }
//     if (query.length === 1 || score > 1) {
//         const location = [a.category?.name, a.info.title, e.type === 'header' ? '' : '...', e.value].filter(e => e).join(' > ')
//         const link = `${this.path}/${a.info.categoryId}/${a.info.id}#${formatHref(e.value)}`
//         const ql = matchWords.length
//         const snippet = [
//             ...a.words.slice(wi - 3, wi),               // Last 3 Words
//             `<span>${matchWords.join(' ')}</span>`,     // Search Query
//             ...a.words.slice(ql + wi, ql + wi + 5)      // Next 5 Words
//         ].join(' ')
//         results.push({ score, link, snippet, location })
//     }
// }

// // Sort Results
// results.sort((a, b) => b.score - a.score)
// res.json(results)