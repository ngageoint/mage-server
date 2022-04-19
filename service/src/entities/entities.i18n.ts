const LanguageTagImpl = require('rfc5646') as typeof RFC5646LanguageTagImpl


/**
 * `Locale` contains information about a client's location and localization
 * preferences.
 */
export interface Locale {
  language: LanguageTag
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
  suitableFor(targetLanguageTag: string): boolean
}

export const LanguageTag = RFC5646LanguageTagImpl


declare class RFC5646LanguageTagImpl implements LanguageTag {
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
  suitableFor(targetLanguageTag: string): boolean
}

export function selectLanguageTagFor(target: LanguageTag, contentLanguages: string[]): string | null {
  return null
}
