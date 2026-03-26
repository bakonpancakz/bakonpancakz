import { Element } from "../types/articles"

// Format ISO Timestamp into Generic Date (ex: Jun 26th 2003) 
export function formatDate(isoTimestamp: string): string {
    const t = new Date(isoTimestamp)
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dece'][t.getMonth()]
    const d = t.getDate()
    const y = t.getFullYear()
    return `${m} ${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} ${y}`
}

// Format String for Usage in HREF Tags
export function formatHref(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/[^A-Za-z0-9 ]/g, '')
        .replace(/\s+/g, '-')
}

// Determine byte size by length
export function byteSize(length: number) {
    if (length > 1e+9) return `${(length / 1e+9).toFixed(2)}gb`
    if (length > 1e+6) return `${(length / 1e+6).toFixed(2)}mb`
    if (length > 1024) return `${(length / 1024).toFixed(2)}kb`
    return `${length}b`
}

// Estimate Required Time to Read this Article
export function calcReadTime(articleElements: Array<Element>): number {
    return Math.ceil(
        articleElements
            .map((e): number => {
                const AVERAGE_READING_SPEED = 200 // wpm
                switch (e.type) {

                    // Calculate seconds based on average reading speed divided by amount of characters
                    case 'list': return e.items.map(e => e.length).reduce((a, b) => a + b, 0) / AVERAGE_READING_SPEED
                    case 'text': return e.items.map(e => e.content.split(' ').length).reduce((a, b) => a + b, 0) / AVERAGE_READING_SPEED
                    case 'code': return e.content.split(' ').length / AVERAGE_READING_SPEED

                    case 'subheader':
                    case 'header':
                    case 'quote':
                        return e.value.split(' ').length / AVERAGE_READING_SPEED
                    case 'table':
                        return e.items
                            .map(r => r.map(c => c.split(' ').length).reduce((a, b) => a + b, 0))
                            .reduce((a, b) => a + b, 0)
                            / AVERAGE_READING_SPEED

                    // Static increases for each image element
                    case 'image':
                    case 'banner':
                    case 'beanie':
                        return 0.25 // 15 seconds

                    // Static increases for each video element
                    case 'video':
                    case 'audio':
                        return 0.50 // 30 seconds
                }
            })
            .reduce((a, b) => a + b, 0)
    )
}