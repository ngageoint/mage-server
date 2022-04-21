const RFC5646LanguageTagImpl = require('rfc5646') as typeof RFC5646LanguageTagImplType


/**
 * `Locale` contains information about a client's location and localization
 * preferences.
 */
export interface Locale {
  languagePreferences: LanguageTag[]
}

/**
 *  A `LanguageTag` instance represents a language tag as defined in
 * [RFC-5646](https://www.rfc-editor.org/rfc/rfc5646.html).
 */
export interface LanguageTag {
  readonly language: string
  readonly region: string
  readonly script: string
  readonly variant: string
  readonly invalid: boolean | null | undefined
  readonly privateuse: object
  readonly extensions: string
  readonly wild: boolean
  readonly length: string
  readonly first: string
  /**
   * Return a new tag without the unnecessary script, extensions, and variant
   * components of this tag.
   */
  get minimal(): LanguageTag
  suitableFor(targetLanguageTag: string): boolean
  toString(): string
}

export const ContentLanguageKey = Symbol.for('ContentLanguage')

export type Localized<T> = T & {
  [ContentLanguageKey]?: LanguageTag
}

export const LanguageTag = RFC5646LanguageTagImpl

/**
 * Choose the best matching content language from the given list of content
 * languages for the given list of language preferences.  The preferences list
 * should be in descending order of preference.  Return null if none of the
 * content languages satisfies the preferences.
 * @param preferences
 * @param contentLanguages
 * @returns the matched content lanugage or null
 */
export function selectContentLanguageFor(preferences: LanguageTag[], contentLanguages: LanguageTag[]): LanguageTag | null {
  for (const pref of preferences) {
    const match = contentLanguages.find(x => x.suitableFor(pref.minimal.toString()))
    if (match) {
      return match
    }
  }
  return null
}

/**
 * Parse the string that represents a client's language preferences, as defined
 * in [RFC-7231](https://www.rfc-editor.org/rfc/rfc7231.html#section-5.3.5)
 * (HTTP/1.1).  These strings appear in the `Accept-Language` HTTP header.
 * Return an array of {@link LanguageTag | language tag} instances in descending
 * order of preference.
 *
 * Example:
 * ```text
 * Accept-Language: da, en-gb;q=0.8, en;q=0.7
 * ```
 * The portion following `Accept-Language: ` is what this function expects.
 * @param header
 * @returns
 */
export function parseAcceptLanguageHeader(header: string | null | undefined): LanguageTag[] {
  if (!header) {
    return []
  }
  const ranges = header.split(',')
    .reduce((ranges, part) => {
      const range = parseLanguageRange(part)
      if (range) {
        ranges.push(range)
      }
      return ranges
    }, [] as LanguageRange[])
    .sort((a, b) => b.quality - a.quality)
  return ranges.map(x => x.tag)
}

declare class RFC5646LanguageTagImplType implements LanguageTag {
  constructor(tag: string)
  readonly language: string
  readonly region: string
  readonly script: string
  readonly variant: string
  readonly invalid: boolean | null | undefined
  readonly privateuse: object
  readonly extensions: string
  readonly wild: boolean
  readonly length: string
  readonly first: string
  get minimal(): LanguageTag
  suitableFor(targetLanguageTag: string): boolean
}

interface LanguageRange {
  tag: LanguageTag
  quality: number
}

function parseLanguageRange(range: string): LanguageRange | null {
  range = range.trim()
  if (!range.length) {
    return null
  }
  const [ tagStr, qualityStr = '' ] = range.split(';')
  const tag = new LanguageTag(tagStr.trim())
  const qualityPart = qualityStr.split(/=\s*/)[1] || ''
  // absence of quality value implies 1.0 per rfc-7231
  const quality = parseFloat(qualityPart.trim()) || 1.0
  return { tag, quality }
}
