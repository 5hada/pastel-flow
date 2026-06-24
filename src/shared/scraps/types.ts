

export type ScrapType = 
    |   'url'
    |   'file'
    |   'memo'
    |   'text'


export type ScrapItem = {
    id: string
    title: string
    date: string
    type: ScrapType
    meta: ScrapMeta
    status: ScrapStatus
}


export type ScrapStatus = 
    |   'inbox'
    |   'processing'
    |   'classified'
    |   'archived'
    |   'dismissed'


export type ScrapMeta = 
    |   ScrapUrlMeta
    |   ScrapFileMeta
    |   ScrapMemoMeta
    |   ScrapTextMeta

export type ScrapUrlMeta = {
    content: string
    // urlType: UrlType
}

export type ScrapFileMeta = {
    path: string
    // extension: ExtensionType
}

export type ScrapMemoMeta = {
    content: string
}

export type ScrapTextMeta = {
    content: string
    source: string | unknown
}