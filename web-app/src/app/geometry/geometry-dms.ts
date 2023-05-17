export class DMSCoordinate {

  constructor(
    public degrees: number | null,
    public minutes: number | null,
    public seconds: number | null,
    public hemisphere: HemisphereLabel | null
  ) { }

  toDecimalDegrees() {
    let result = this.degrees
    if (this.minutes) {
      result += this.minutes / 60.0
    }
    if (this.seconds) {
      result += this.seconds / 3600.0
    }
    if (this.hemisphere == 'S' || this.hemisphere == 'W') {
      result *= -1
    }
    return result
  }

  format(opts: DMSFormatOptions = { hemisphereIndicator: 'label', padDegrees: true }): string {
    return formatDMS(this, opts)
  }

  toString() {
    return this.format()
  }
}

interface DMSFormatOptions {
  hemisphereIndicator: 'sign' | 'label'
  padDegrees: boolean
}

/**
 * Parse latitude and longitude strings in degrees-minutes-seconds format.
 * The requirements say this class must support parsing the following
 * coordinate strings.
 * 1. 112233N 0112244W
 * 2. N 11 ° 22'33 "- W 11 ° 22'33
 * 3. 11 ° 22'33 "N - 11 ° 22'33" W
 * 4. 11° 22'33 N 011° 22'33 W
 */
export class DMS {

  /**
   * Parse the given DMS coordinate string and return the value in decimal
   * degrees.  Return `NaN` if parsing fails.
   */
  static parse(input: string, dimension: DimensionKey): number {
    if (!input) {
      return NaN
    }
    const inputCondensed = input.replace(/\s/g, '')
    // check if it is a number and that number could be a valid latitude or longitude
    // could either be a decimal or a whole number representing lat/lng or a DDMMSS.sss number representing degree minutes seconds
    const decimalDegrees = Number(inputCondensed)
    if (!isNaN(decimalDegrees)) {
      if (
        (dimension === DimensionKey.Longitude && decimalDegrees >= -180.0 && decimalDegrees <= 180.0) ||
        (dimension === DimensionKey.Latitude && decimalDegrees >= -90.0 && decimalDegrees <= 90.0)
      ) {
        return decimalDegrees
      }
    }
    const dms = parseDMS(inputCondensed)
    return dms.toDecimalDegrees()
  }

  /**
   * Split the given string into possibly two coordinates with all spaces
   * removed.  No further normalization takes place.
   */
  static splitCoordinates(coordinates: string): string[] {
    let split: string[] = []

    if (!coordinates) {
      return split
    }

    const coordinatesToParse = coordinates.trim().toUpperCase()

    // if there is a comma, split on that
    if (coordinatesToParse.includes(',')) {
      return coordinatesToParse.split(',').map(splitString => splitString.replace(/\s/g, ''))
    }

    // check if there are any direction letters
    const firstDirectionIndex = indexOfFirstHemisphere(coordinatesToParse)
    const hasDirection = firstDirectionIndex !== -1

    // if the string has a direction we can try to split on the dash
    if (hasDirection && coordinatesToParse.indexOf('-') !== -1) {
      return coordinatesToParse.split('-').map(splitString => splitString.replace(/\s/g, ''))
    } else if (hasDirection) {
      // if the string has a direction but no dash, split on the direction
      const lastDirectionIndex = indexOfLastHemisphere(coordinatesToParse)

      // the direction will either be at the begining of the string, or the end
      // if the direction is at the begining of the string, use the second index unless there is no second index
      // in which case there is only one coordinate
      if (firstDirectionIndex === 0) {
        if (lastDirectionIndex !== firstDirectionIndex) {
          split.push(coordinatesToParse.substring(0,lastDirectionIndex))
          split.push(coordinatesToParse.substring(lastDirectionIndex))
        } else {
          // only one coordinate
          split.push(coordinatesToParse)
        }
      } else if (lastDirectionIndex == coordinatesToParse.length - 1) {
        // if the last direction index is the end of the string use the first index unless the first and last index are the same
        if (lastDirectionIndex === firstDirectionIndex) {
          // only one coordinate
          split.push(coordinatesToParse)
        } else {
          split.push(coordinatesToParse.substring(0, firstDirectionIndex+1))
          split.push(coordinatesToParse.substring(firstDirectionIndex+1))
        }
      }
    }

    // one last attempt to split.  if there is one white space character split on that
    const whitespaceSplit = coordinatesToParse.split(/\r?\n|\r|\s/g)
    if (whitespaceSplit.length <= 2) {
      split = whitespaceSplit
    }

    return split.map(splitString => splitString.replace(/\r?\n|\r|\s/g, ''))
  }

  static validateLatitudeFromDMS(input: string): boolean {
    return validateCoordinateFromDMS(input, DimensionKey.Latitude)
  }

  static validateLongitudeFromDMS(input: string): boolean {
    return validateCoordinateFromDMS(input, DimensionKey.Longitude)
  }

  static formatLatitude(degrees: number): string {
    return formatDegrees(degrees, DimensionKey.Latitude)
  }

  static formatLongitude(degrees: number): string {
    return formatDegrees(degrees, DimensionKey.Longitude)
  }
}

function parseDMS(input: string): DMSCoordinate {
  const dmsCoordinate = new DMSCoordinate(null, null, null, null)
  let coordinateToParse = input.replace(/\s/g, '')

  // strip out any non numerics except direction
  coordinateToParse = coordinateToParse.replace(/[^\d.NSEWnsew]/g, '')
  if (coordinateToParse.length == 0) {
    return dmsCoordinate
  }

  const lastCharacter = coordinateToParse[coordinateToParse.length - 1]
  if (lastCharacter && isNaN(Number(lastCharacter))) {
    // the last character might be a direction not a number
    dmsCoordinate.hemisphere = lastCharacter.toUpperCase() as HemisphereLabel
    coordinateToParse = coordinateToParse.slice(0, -1)
  }
  if (coordinateToParse.length == 0) {
    return dmsCoordinate
  }

  const firstCharacter = coordinateToParse[0]
  if (firstCharacter && isNaN(Number(firstCharacter))) {
    // the first character might be a direction not a number
    dmsCoordinate.hemisphere = firstCharacter.toUpperCase() as HemisphereLabel
    coordinateToParse = coordinateToParse.substring(1)
  }

  // remove all characters except numbers and decimal points
  coordinateToParse = coordinateToParse.replace(/[^\d.]/g, '')

  // split the numbers before the decimal seconds
  if (coordinateToParse.length === 0) {
    return dmsCoordinate
  }
  const split = coordinateToParse.split('.')

  coordinateToParse = split[0]
  const decimalSeconds = split.length == 2 ? Number(split[1]) : null

  if (coordinateToParse.length != 0) {
    dmsCoordinate.seconds = Number(coordinateToParse.slice(-2))
    coordinateToParse = coordinateToParse.slice(0, -2)
  }
  if (coordinateToParse.length != 0) {
    dmsCoordinate.minutes = Number(coordinateToParse.slice(-2))
    coordinateToParse = coordinateToParse.slice(0, -2)
  }
  if (coordinateToParse.length != 0) {
    dmsCoordinate.degrees = Number(coordinateToParse)
  }

  if (isNaN(dmsCoordinate.degrees)) {
    if (isNaN(dmsCoordinate.minutes)) {
      dmsCoordinate.degrees = dmsCoordinate.seconds
      dmsCoordinate.seconds = null
    } else {
      dmsCoordinate.degrees = dmsCoordinate.minutes
      dmsCoordinate.minutes = dmsCoordinate.seconds
      dmsCoordinate.seconds = null
    }
  }

  if ((dmsCoordinate.minutes == null || isNaN(dmsCoordinate.minutes)) && (dmsCoordinate.seconds == null || isNaN(dmsCoordinate.seconds)) && decimalSeconds !== null) {
    // this would be the case if a decimal degrees was passed in ie 11.123
    let decimal = Number('.' + decimalSeconds)
    if (isNaN(decimal)) {
      decimal = 0.0
    }
    dmsCoordinate.minutes = Math.floor(Math.abs(decimal * 60.0))
    // have to do this because 2.3 % 1 == .299999999998 in javascript and not .3
    const decimalRemainderOfMinutes = decimalPart(decimal * 60.0)// Number(((decimal * 60.0)+"").split(".")[1])
    const seconds = Math.abs(decimalRemainderOfMinutes * 60.0)
    dmsCoordinate.seconds = Math.round(seconds)
  } else if (decimalSeconds !== null && !isNaN(decimalSeconds)) {
    // add the decimal seconds to seconds and round
    dmsCoordinate.seconds = Math.round(Number(dmsCoordinate.seconds + '.' + decimalSeconds))
  }

  if (dmsCoordinate.seconds == 60) {
    dmsCoordinate.minutes = dmsCoordinate.minutes + 1
    dmsCoordinate.seconds = 0
  }

  if (dmsCoordinate.minutes == 60) {
    dmsCoordinate.degrees = dmsCoordinate.degrees + 1
    dmsCoordinate.minutes = 0
  }
  return dmsCoordinate
}

function indexOfFirstHemisphere(coordinateString): number {
  const northDirectionIndex = coordinateString.indexOf('N')
  const southDirectionIndex = coordinateString.indexOf('S')
  const eastDirectionIndex = coordinateString.indexOf('E')
  const westDirectionIndex = coordinateString.indexOf('W')
  const directionIndex = Math.min(northDirectionIndex == -1 ? Number.MAX_VALUE : northDirectionIndex,
     southDirectionIndex == -1 ? Number.MAX_VALUE : southDirectionIndex,
     eastDirectionIndex == -1 ? Number.MAX_VALUE : eastDirectionIndex,
     westDirectionIndex == -1 ? Number.MAX_VALUE : westDirectionIndex)
  return directionIndex == Number.MAX_VALUE ? -1 : directionIndex
}

function indexOfLastHemisphere(coordinateString): number {
  return Math.max(coordinateString.lastIndexOf('N'), coordinateString.lastIndexOf('S'), coordinateString.lastIndexOf('E'), coordinateString.lastIndexOf('W'))
}

function zeroPadStart(num: number, padCount: number) { return num < 0 ? '-' : '' + String(Math.abs(num)).padStart(padCount, '0') }

function decimalPart(num: number) {
  const parts = String(num).split('.')
  const fraction = parts.length == 2 ? parts[1] : '0'
  return Number(`.${fraction}`)
}

function formatDMS(coord: DMSCoordinate, opts: DMSFormatOptions = { hemisphereIndicator: 'label', padDegrees: true }): string {
  const deg = coord.degrees || 0
  const min = coord.minutes || 0
  const sec = coord.seconds || 0
  const dim = Dimension.forHemisphere(coord.hemisphere)
  const degPart = opts.padDegrees !== false ? dim.zeroPadDegrees(deg) : String(deg)
  return ''
}

function formatDegrees(decimalDegrees: number, dimension: DimensionKey): string {
  let wholeDegrees = Math.trunc(Math.abs(decimalDegrees))
  let minutes = Math.floor(Math.abs(decimalPart(decimalDegrees) * 60.0))
  let seconds = Math.round(Math.abs(decimalPart(decimalPart(decimalDegrees) * 60.0)) * 60.0)
  if (seconds == 60) {
    seconds = 0
    minutes += 1
  }
  if (minutes == 60) {
    wholeDegrees += 1
    minutes = 0
  }
  const dim = Dimension[dimension]
  const hemisphere = dim.hemisphereForDegrees(decimalDegrees)
  return `${dim.zeroPadDegrees(wholeDegrees)}° ${zeroPadStart(minutes, 2)}' ${zeroPadStart(seconds, 2)}" ${hemisphere}`
}

/*
TODO: parsing and validation should be using the same logic. this is
essentially alternate parsing logic with different rules.
 */
function validateCoordinateFromDMS(input: string, dimension: DimensionKey): boolean {
  if (typeof input !== 'string') {
    return false
  }
  input = input.trim()
  const letters = /^[0-9NSEWnsew. °\'\"]+$/
  if (!letters.test(input)) {
    return false
  }

  let coordinateToParse = input.replace(/[^\d.NSEWnsew]/g, '')

  // There must be a direction as the last character
  const direction = coordinateToParse[coordinateToParse.length - 1]
  if (!isNaN(Number(direction))) {
    return false
  }
  else {
    if (dimension === DimensionKey.Latitude && direction.toUpperCase() !== 'N' && direction.toUpperCase() !== 'S') {
      return false
    }
    if (dimension === DimensionKey.Longitude && direction.toUpperCase() !== 'E' && direction.toUpperCase() !== 'W') {
      return false
    }
    coordinateToParse = coordinateToParse.slice(0, -1)
  }

  // split the numbers before the decimal seconds
  const split = coordinateToParse.split('.')
  if (split.length === 0) {
    return false
  }

  coordinateToParse = split[0]

  // there must be either 5 or 6 digits for latitude (1 or 2 degrees, 2 minutes, 2 seconds)
  // or 5, 6, 7 digits for longitude
  if (dimension === DimensionKey.Latitude && (coordinateToParse.length < 5 || coordinateToParse.length > 6)) {
    return false
  }
  if (dimension === DimensionKey.Longitude && (coordinateToParse.length < 5 || coordinateToParse.length > 7)) {
      return false
  }

  let decimalSeconds = 0
  if (split.length === 2) {
    if (!isNaN(Number(split[1]))) {
      decimalSeconds = Number(split[1])
    } else {
      return false
    }
  }

  const seconds = Number(coordinateToParse.slice(-2))
  coordinateToParse = coordinateToParse.slice(0, -2)

  const minutes = Number(coordinateToParse.slice(-2))
  const degrees = Number(coordinateToParse.slice(0, -2))

  if (!isNaN(degrees)) {
    if (dimension === DimensionKey.Latitude && (degrees < 0 || degrees > 90)) {
      return false
    }
    if (dimension === DimensionKey.Longitude && (degrees < 0 || degrees > 180)) {
      return false
    }
  } else {
    return false
  }

  if (!isNaN(minutes) && !isNaN(degrees)) {
    if (
      (minutes < 0 || minutes > 59) ||
      (dimension === DimensionKey.Latitude && degrees == 90 && minutes != 0) ||
      (dimension === DimensionKey.Longitude && degrees == 180 && minutes != 0)
    ) {
      return false
    }
  }
  else {
    return false
  }

  if (!isNaN(seconds) && !isNaN(degrees)) {
    if (
      (seconds < 0 || seconds > 59) ||
      (dimension === DimensionKey.Latitude && degrees == 90 && (seconds != 0 || decimalSeconds != 0)) ||
      (dimension === DimensionKey.Longitude && degrees == 180 && (seconds != 0 || decimalSeconds != 0))
    ) {
      return false
    }
  }
  else {
    return false
  }

  return true
}

export enum DimensionKey {
  Latitude = 'lat',
  Longitude = 'lon',
}

const Dimension = {
  [DimensionKey.Latitude]: {
    hemisphereForDegrees: (deg: number) => (deg < 0 ? 'S' : 'N') as LatitudeHemisphereLabel,
    zeroPadDegrees: (deg: number) => zeroPadStart(deg, 2),
    excludes: (deg: number) => deg < -90 || deg > 90,
  },
  [DimensionKey.Longitude]: {
    hemisphereForDegrees: (deg: number) => (deg < 0 ? 'W' : 'E') as LongitudeHemisphereLabel,
    zeroPadDegrees: (deg: number) => zeroPadStart(deg, 3),
    excludes: (deg: number) => deg < -180 || deg > 180,
  },
  keyForHemisphere: (hemi: HemisphereLabel) => hemi === 'E' || hemi === 'W' ? DimensionKey.Longitude : DimensionKey.Latitude,
  forHemisphere: (hemi: HemisphereLabel) => Dimension[Dimension.keyForHemisphere(hemi)],
} as const

export type LatitudeHemisphereLabel = 'N' | 'S'
export type LongitudeHemisphereLabel = 'E' | 'W'
export type HemisphereLabel = LatitudeHemisphereLabel | LongitudeHemisphereLabel

function Char(c: string) {
  const is = {
    get digit() { return /\d/.test(c) },
    get dot() { return c === '.' },
    get hemisphere() { return c in { n:1, s:1, e:1, w:1, N:1, S:1, E:1, W:1 } },
    get space() { return /\s/.test(c) },
    get sign() { return c === '+' || c === '-' },
    get unitLabel() { return c in { '°':1, '\'':1, '"':1 } },
    get degreesLabel() { return c === '°' },
    get minutesLabel() { return c === "'" },
    get secondsLabel() { return c === '"' },
    get endOfInput() { return c === undefined || c === null || c === '' },
  }
  return {
    is,
    get value() { return c },
    toString() { return c },
  }
}

type Char = ReturnType<typeof Char>

class ParseContext {

  private _pos: number = 0
  private c: Char = Char(this.input[this.pos])

  coords: (DMSCoordinate | number)[]

  constructor(readonly input: string) {}

  get pos(): number {
    return this._pos
  }

  get currentChar(): Char {
    return this.c
  }

  get finished(): boolean {
    return this.pos >= this.input.length
  }

  get remaining(): boolean {
    return this.pos < this.input.length
  }

  advanceCursor(): this {
    this.c = Char(this.input[++this._pos])
    return this
  }

  lookAhead(): Char {
    return Char(this.input[this.pos + 1])
  }

  /**
   * Return the current character, then advance the cursor to the next
   * position.  This is short-hand for
   * ```typescript
   * const c = ctx.currentChar()
   * ctx.advanceCursor()
   * ```
   */
  consumeCurrentChar(): Char {
    const c = this.currentChar
    this.advanceCursor()
    return c
  }

  error(message: string = '', reason: string | number = ''): DMSParseError {
    const pos = typeof reason === 'string' ? this.pos - reason.length : reason
    return new DMSParseError(this.input, pos, message)
  }
}

function start(input: string): (number | DMSCoordinate)[] | DMSParseError {
  input = input.trim()
  const coords: (number | DMSCoordinate)[] = []
  const parsing = new ParseContext(input)
  while (!parsing.finished) {
    const coord = parseCoordinate(parsing)
    if (coord instanceof DMSParseError) {
      return coord
    }
    coords.push(coord)
    skipWhiteSpace(parsing)
    if ((parsing.currentChar.value === '-' && parsing.lookAhead().is.space) || parsing.currentChar.value === ',') {
      skipWhiteSpace(parsing.advanceCursor())
    }
  }
  return coords
}

function parseCoordinate(parsing: ParseContext): number | DMSCoordinate | DMSParseError {
  if (parsing.currentChar.is.hemisphere) {
    return parseDmsCoordinate(parsing)
  }
  else if (parsing.currentChar.is.sign) {
    return parseDecimal(parsing)
  }
  else if (parsing.currentChar.is.digit) {
    const digits = parseDigits(parsing)
    if (digits instanceof DMSParseError) {
      return digits
    }
    if (parsing.currentChar.is.dot) {
      return parseDecimal(parsing, digits)
    }
    if (parsing.currentChar.is.space) {
      skipWhiteSpace(parsing)
    }
    if (parsing.currentChar.is.unitLabel || parsing.currentChar.is.hemisphere) {
      return parseDmsCoordinate(parsing, digits)
    }
    return parseDecimal(parsing, digits)
  }
  return parsing.error()
}

function parseDmsCoordinate(parsing: ParseContext, digits: string = ''): DMSCoordinate | DMSParseError {
  if (digits) {
    const digitsStart = parsing.pos - digits.length
    skipWhiteSpace(parsing)
    if (parsing.currentChar.is.unitLabel) {
      /*
      the caller parsed digits, then encountered a unit to trigger the dms rule
      */
      const dmsParts = parseLabeledDmsParts(parsing, digits)
      if (dmsParts instanceof DMSParseError) {
        return dmsParts
      }
      skipWhiteSpace(parsing)
      if (parsing.currentChar.is.hemisphere) {
        const hemi = parsing.consumeCurrentChar().value as HemisphereLabel
        return dmsCoordOrError(parsing, digitsStart, dmsParts, hemi)
      }
      return parsing.error('expected hemisphere after dms parts')
    }
    else if (parsing.currentChar.is.hemisphere) {
      /*
      the caller parsed digits, then encountered a hemisphere, so expect
      unlabeled compact dms, e.g. 112233N
      */
      const hemi = parsing.consumeCurrentChar().value as HemisphereLabel
      const dmsParts = parseUnlabeledCompactDmsParts(parsing, digits)
      return dmsCoordOrError(parsing, digitsStart, dmsParts, hemi)
    }
  }
  else if (parsing.currentChar.is.hemisphere) {
    /*
    the caller encountered a leading hemisphere, so expect either
    labeled dms or unlabeled compact dms
    */
    const hemi = parsing.consumeCurrentChar().value as HemisphereLabel
    skipWhiteSpace(parsing)
    const digitsStart = parsing.pos
    const expectedDigits = parseDigits(parsing)
    if (expectedDigits instanceof DMSParseError) {
      return expectedDigits
    }
    skipWhiteSpace(parsing)
    if (parsing.currentChar.is.unitLabel) {
      const dmsParts = parseLabeledDmsParts(parsing, expectedDigits)
      return dmsCoordOrError(parsing, digitsStart, dmsParts, hemi)
    }
    else {
      const dmsParts = parseUnlabeledCompactDmsParts(parsing, expectedDigits)
      return dmsCoordOrError(parsing, digitsStart, dmsParts, hemi)
    }
  }
  return parsing.error()
}

type DMSParts = { deg: number, min: number, sec: number }

function dmsCoordOrError(parsing: ParseContext, coordPos: number, which: DMSParts | DMSParseError, hemi: HemisphereLabel): DMSCoordinate | DMSParseError {
  if (which instanceof DMSParseError) {
    return which
  }
  if (which.min > 59) {
    return parsing.error('minutes must be less than 60', coordPos)
  }
  if (which.sec > 59) {
    return parsing.error('seconds must be less than 60', coordPos)
  }
  const coord = new DMSCoordinate(which.deg, which.min, which.sec, hemi)
  const dim = Dimension.forHemisphere(hemi)
  if (dim.excludes(coord.toDecimalDegrees())) {
    return parsing.error('coordinate out of bounds', coordPos)
  }
  return new DMSCoordinate(which.deg, which.min, which.sec, hemi)
}

/**
 * Parse the rest of the labeled DMS parts after the given digits.  The current
 * character should be a DMS unit label (°|'|") that indicates the labeled DMS
 * format.
 * @param parsing the parse context
 * @param digits the digits parsed before encountering a unit label
 * @returns
 */
function parseLabeledDmsParts(parsing: ParseContext, digits: string): { deg: number, min: number, sec: number } | DMSParseError {
  const allUnits = Array.from(`°'"`)
  const rankOfUnit = { '°': 0, "'": 1, '"': 2 }
  const dmsParts = { '°': 0, "'": 0, '"': 0 }
  const exhaustedUnits = {} as { [unit in '°' | "'" | '"']?: any }
  while (parsing.currentChar.is.unitLabel) {
    const part = Number(digits)
    if (isNaN(part)) {
      return parsing.error(`invalid digits ${digits}`)
    }
    const unit = parsing.consumeCurrentChar().value
    if (unit in exhaustedUnits) {
      return parsing.error(`dms unit ${unit} out of order`)
    }
    allUnits.slice(0, rankOfUnit[unit] + 1).forEach(unit => exhaustedUnits[unit] = 1)
    dmsParts[unit] = part
    skipWhiteSpace(parsing)
    if (parsing.currentChar.is.digit) {
      const nextDigits = parseDigits(parsing)
      if (nextDigits instanceof DMSParseError) {
        return nextDigits
      }
      digits = nextDigits
    }
    skipWhiteSpace(parsing)
  }
  return {
    deg: dmsParts['°'],
    min: dmsParts["'"],
    sec: dmsParts['"'],
  }
}

function parseUnlabeledCompactDmsParts(parsing: ParseContext, digits: string): DMSParts | DMSParseError {
  if (digits.length < 5) {
    return parsing.error(`expected at least 5 digits for unlabeled condensed dms parts`, digits)
  }
  const sec = Number(digits.slice(-2))
  const min = Number(digits.slice(-4, -2))
  const deg = Number(digits.slice(0, -4))
  return { deg, min, sec }
}

function parseDigits(parsing: ParseContext): string | DMSParseError {
  if (!parsing.currentChar.is.digit) {
    return parsing.error('expected a digit')
  }
  let digits = parsing.currentChar.value
  while (parsing.advanceCursor().currentChar.is.digit) {
    digits += parsing.currentChar.value
  }
  return digits
}

function parseDecimal(parsing: ParseContext, parsedDigits: string = ''): number | DMSParseError {
  let sign = ''
  if (parsing.currentChar.is.sign && !parsedDigits) {
    sign = parsing.consumeCurrentChar().value
  }
  const whole = parsedDigits ? parsedDigits : parseDigits(parsing)
  if (whole instanceof DMSParseError) {
    return whole
  }
  if (parsing.currentChar.is.dot) {
    parsing.advanceCursor()
    const fraction = parseDigits(parsing)
    if (fraction instanceof DMSParseError) {
      return fraction
    }
    return Number(`${sign}${whole}.${fraction}`)
  }
  return Number(`${sign}${whole}`)
}

function skipWhiteSpace(parsing: ParseContext): void {
  while (parsing.currentChar.is.space) {
    parsing.advanceCursor()
  }
}

export function parseCoordinates(input: string): (DMSCoordinate | number)[] | DMSParseError {
  return start(input)
}

export class DMSParseError extends Error {
  constructor(readonly input: string, readonly pos: number, message: string = '') {
    super(`${message || 'error parsing DMS coordinates'} at position ${pos} of input ${input}`)
  }
}

/*
 peggy grammar (https://peggyjs.org/online.html):

coordinates = first:coordinate others:(_+ @coordinate)* { return [ first, ...others ] }

coordinate = dms_coordinate / decimal

dms_coordinate =
	hem:hemisphere _* dms:dms_parts { return { dms, hem } }
    / dms:dms_parts _* hem:hemisphere { return { dms, hem } }

hemisphere = [nsew]i { return text().toUpperCase() }

dms_parts =
	deg:degrees _* min:minutes _* sec:seconds { return { deg, min, sec } }
    / min:minutes _* sec:seconds { return { min, sec } }
    / sec:seconds|1| { return { sec } }

degrees = digits:digit|1..3| _* '°' { return digits.join('') + '°' }

minutes = digits:digit|1..2| _* "'" { return digits.join('') + "'" }

seconds = digits:digit|1..2| _* '"' { return digits.join('') + '"' }

decimal = [-+]? whole:digit|1..3| ('.' fraction:digit+)? { return parseFloat(text()) }

digit = [0-9]
 */
