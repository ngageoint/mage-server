
export interface StaticIcon {
  id: string
  sourceUrl: string
  contentPath: string
  title?: string
  summary?: string
  fileName?: string
  tags?: string[]
}

export interface RegisteredStaticIconReference {
  id: string
  sourceUrl?: never
}

export interface SourceUrlStaticIconReference {
  sourceUrl: string
  id?: never
}

export const contentPathOfIcon = (icon?: StaticIcon | RegisteredStaticIconReference | string | null | undefined): string | undefined => {
  if (!icon) {
    return
  }
  if (typeof icon !== 'string') {
    icon = icon.id
  }
  return `/api/icons/${icon}/content`
}

export type StaticIconReference = RegisteredStaticIconReference | SourceUrlStaticIconReference
