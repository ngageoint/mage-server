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
