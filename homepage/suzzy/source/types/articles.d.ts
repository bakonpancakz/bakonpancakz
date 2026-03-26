type FilePath = string;

export interface Locals {
    relevantArticle?: ManifestArticle       // Current Article (if any)
    relevantArticles: ManifestArticle[]     // List of all articles filtered by current category
    relevantCategory?: ManifestEntry        // Relevant Articles
    articles: ManifestArticle[]             // List of all articles in manifest
    authors: ManifestEntry[]                // List of all authors in manifest
    categories: ManifestEntry[]             // List of all categories in manifest
    pageIndex: number                       // Current Index given by user
    pageOffset: number                      // Current Offset for relevantArticles
    pageTotal: number                       // Total amount of relevant pages
    pageCurrent: number                     // Current Page Number
}

export interface Manifest {
    noBrowser?: boolean;
    itemsPerPage?: number;
    categories: Array<ManifestEntry>
    authors: Array<ManifestEntry>
    articles: Array<FilePath>
}

export interface ManifestEntry {
    id: string;
    name: string;
    icon: FilePath;
}

export interface ManifestArticle {
    info: {
        id: string;
        created: string;
        categoryId: string;
        authorId: string;
        title: string;
        snippet: string;
        banner: FilePath;
        noindex: string;
    }
    path: string;
    category: ManifestEntry;
    author: ManifestEntry;
    elements: Array<Element>;
}

export type Element =
    HeaderElement |
    SubheaderElement |
    QuoteElement |
    ImageElement |
    TextElement |
    BannerElement |
    BeanieElement |
    VideoElement |
    AudioElement |
    ListElement |
    TableElement |
    CodeElement

// Header/Chapter Element
export interface HeaderElement {
    type: 'header';
    value: string;
}

// Subchapter Element
export interface SubheaderElement {
    type: 'subheader';
    value: string;
}


// Quote Text Element
export interface QuoteElement {
    type: 'quote';
    value: string;
}

// Text Element
export interface TextElement {
    type: 'text';
    items: {
        tag: string;
        content: string;
        target?: string;
        href?: string;
    }[]
}

// Bordered Image Element
export interface ImageElement {
    type: 'image';
    resource: string;
    caption: string;
    alt: string;
}

// Borderless Image Element
export interface BannerElement {
    type: 'banner';
    resource: string;
    caption: string;
    alt: string;
}

// Borderless Image Element with Download on Click
export interface BeanieElement {
    type: 'beanie';
    resource: string;
    caption: string;            // Unused
    alt: string;
}

// Video Element
export interface VideoElement {
    type: 'video';
    resource: string;
    caption: string;
    alt: string;
    cover: string;
}

// Audio Player
export interface AudioElement {
    type: 'audio';
    resource: string;
    name: string;
}

// List Element
export interface ListElement {
    type: 'list';
    items: string[];
}

// Table Element
export interface TableElement {
    type: 'table';
    items: string[][];
}

// Code Element
export interface CodeElement {
    type: 'code';
    content: string;
}