
export enum DimensionKey {
  Latitude = 'lat',
  Longitude = 'lon',
}

export const Dimension = {
  [DimensionKey.Latitude]: {
    get key() { return DimensionKey.Latitude },
    hemisphereForDegrees: (deg: number) => (deg < 0 ? 'S' : 'N') as LatitudeHemisphereLabel,
    zeroPadDegrees: (deg: number) => zeroPadStart(deg, 2),
    excludes: (deg: number) => !latitudeIncludes(deg),
    includes: (deg: number) => latitudeIncludes(deg),
  },
  [DimensionKey.Longitude]: {
    get key() { return DimensionKey.Longitude },
    hemisphereForDegrees: (deg: number) => (deg < 0 ? 'W' : 'E') as LongitudeHemisphereLabel,
    zeroPadDegrees: (deg: number) => zeroPadStart(deg, 3),
    excludes: (deg: number) => !longitudeIncludes(deg),
    includes: (deg: number) => longitudeIncludes(deg),
  },
  keyForHemisphere: (hemi: HemisphereLabel) => hemi === 'E' || hemi === 'W' ? DimensionKey.Longitude : DimensionKey.Latitude,
  forHemisphere: (hemi: HemisphereLabel) => Dimension[Dimension.keyForHemisphere(hemi)],
} as const

export type LatitudeHemisphereLabel = 'N' | 'S'
export type LongitudeHemisphereLabel = 'E' | 'W'
export type HemisphereLabel = LatitudeHemisphereLabel | LongitudeHemisphereLabel

export class DMSCoordinate {

  static fromDecimalDegrees(decimalDegrees: number, dimension: DimensionKey): DMSCoordinate | null {
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
    return new DMSCoordinate(wholeDegrees, minutes, seconds, hemisphere)
  }

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

  format(opts: DMSFormatOptions = { padDegrees: true }): string {
    return formatDMSCoordinate(this, opts)
  }

  toString() {
    return this.format()
  }
}


/**
 * Parse latitude and longitude strings in degrees-minutes-seconds format.
 * This function will parse any number of coordinates from the given input.
 * The requirements say this class must support parsing the following
 * coordinate strings.
 * 1. 112233N 0112244W
 * 2. N 11 ° 22'33 "- W 11 ° 22'33
 * 3. 11 ° 22'33 "N - 11 ° 22'33" W
 * 4. 11° 22'33 N 011° 22'33 W
 */
export function parseCoordinates(input: string): (DMSCoordinate | number)[] | DMSParseError {
  const coords = [] as (DMSCoordinate | number)[]
  const parsing = generateParsedCoordinates(input)
  let parsed = parsing.next()
  while (parsed.done === false) {
    coords.push(parsed.value)
    parsed = parsing.next()
  }
  if (parsed.value) {
    return parsed.value
  }
  return coords
}

export function *generateParsedCoordinates(input: string): Generator<DMSCoordinate | number, void | DMSParseError> {
  if (!input || !(input = input.trim())) {
    return
  }
  const parsing = new ParseContext(input)
  while (parsing.remaining) {
    const coord = parsing.startRule(parseCoordinate)
    if (coord instanceof DMSParseError) {
      return coord
    }
    yield coord
    skipWhiteSpace(parsing)
    if ((parsing.currentChar.value === '-' && parsing.lookAhead().is.space) || parsing.currentChar.value === ',') {
      skipWhiteSpace(parsing.advanceCursor())
    }
  }
}

export class DMSParseError extends Error {
  constructor(readonly input: string, readonly pos: number, message: string = '') {
    super(`${message || 'error parsing DMS coordinates'} at position ${pos} of input ${input}`)
  }
}

/**
 * Parse the given DMS coordinate string and return the value in decimal
 * degrees.  Return `NaN` if parsing fails.
 */
export function parseOne(input: string, dimension?: DimensionKey): number {
  const coords = parseCoordinates(input)
  if (Array.isArray(coords) && coords.length === 1) {
    const [ coord ] = coords
    if (typeof coord === 'number') {
      return coord
    }
    if (coord instanceof DMSCoordinate && Dimension.keyForHemisphere(coord.hemisphere) === dimension) {
      return coord.toDecimalDegrees()
    }
  }
  console.error('error parsing degrees from dms', input, coords)
  return NaN
}

export function validateLatitude(input: string): boolean {
  return validateCoordinateFromDMS(input, DimensionKey.Latitude)
}

export function validateLongitude(input: string): boolean {
  return validateCoordinateFromDMS(input, DimensionKey.Longitude)
}

export function formatLatitude(degrees: number): string {
  return formatDecimalDegreesCoordinate(degrees, DimensionKey.Latitude)
}

export function formatLongitude(degrees: number): string {
  return formatDecimalDegreesCoordinate(degrees, DimensionKey.Longitude)
}

interface DMSFormatOptions {
  padDegrees: boolean
}

function zeroPadStart(num: number, padCount: number) { return num < 0 ? '-' : '' + String(Math.abs(num)).padStart(padCount, '0') }

function decimalPart(num: number) {
  const parts = String(num).split('.')
  const fraction = parts.length == 2 ? parts[1] : '0'
  return Number(`.${fraction}`)
}

function formatDMSCoordinate(coord: DMSCoordinate, opts: DMSFormatOptions = { padDegrees: true }): string {
  const deg = coord.degrees || 0
  const min = coord.minutes || 0
  const sec = coord.seconds || 0
  const dim = Dimension.forHemisphere(coord.hemisphere)
  const degPadded = opts.padDegrees !== false ? dim.zeroPadDegrees(deg) : String(deg)
  return `${degPadded}° ${zeroPadStart(min, 2)}' ${zeroPadStart(sec, 2)}" ${coord.hemisphere}`
}

function formatDecimalDegreesCoordinate(decimalDegrees: number, dimension: DimensionKey): string {
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

function validateCoordinateFromDMS(input: string, dimension: DimensionKey): boolean {
  if (!input) {
    return false
  }
  const parsed = parseCoordinates(input)
  if (parsed instanceof DMSParseError) {
    return false
  }
  if (parsed.length !== 1) {
    return false
  }
  const coord = parsed[0]
  return coord instanceof DMSCoordinate ?
    Dimension.keyForHemisphere(coord.hemisphere) === dimension :
    Dimension[dimension].includes(coord)
}

function latitudeIncludes(deg: number): boolean {
  return deg >= -90 && deg <= 90
}

function longitudeIncludes(deg: number): boolean {
  return deg >= -180 && deg <= 180
}

function Char(c: string) {
  const is = {
    get digit() { return /\d/.test(c) },
    get dot() { return c === '.' },
    get hemisphere() { return c in { n:1, s:1, e:1, w:1, N:1, S:1, E:1, W:1 } },
    get space() { return /\s/.test(c) },
    get sign() { return c === '+' || c === '-' },
    get unitLabel() { return c in { '°':1, '\'':1, '"':1 } },
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
  private rulePositionStack = [] as number[]

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

  get ruleStart(): number {
    return this.rulePositionStack[this.rulePositionStack.length - 1]
  }

  advanceCursor(): this {
    return this.moveCursorTo(this.pos + 1)
  }

  lookAhead(): Char {
    return Char(this.input[this.pos + 1])
  }

  moveCursorTo(pos: number): this {
    this._pos = pos
    this.c = Char(this.input[this.pos])
    return this
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

  startRule<R>(rule: (parsing: ParseContext, ...args: any[]) => R | DMSParseError, ...args: any): R | DMSParseError {
    this.rulePositionStack.push(this.pos)
    const result = rule(this, ...args)
    if (!(result instanceof DMSParseError)) {
      this.endRule()
    }
    return result
  }

  endRule(): this {
    this.rulePositionStack.pop()
    return this
  }

  /**
   * Create a `DMSParseError` with the given message.  The `reason` can be
   * either the numeric input position of the cause of the error, or the
   * string of characters consumed from the input that caused the error.
   * In the latter case, the resulting error's position will be the current
   * position, less the length of the given reason string.
   */
  error(message: string = '', reason: string | number = ''): DMSParseError {
    const ruleStart = this.rulePositionStack.pop() || this.pos
    const pos = typeof reason === 'string' ? ruleStart - reason.length : reason
    const inputMarked = this.input.slice(0, pos) + '\u034E' + this.input.slice(pos)
    return new DMSParseError(inputMarked, pos, message)
  }
}

function parseCoordinate(parsing: ParseContext): number | DMSCoordinate | DMSParseError {
  if (parsing.currentChar.is.hemisphere) {
    return parseDmsCoordinate(parsing)
  }
  else if (parsing.currentChar.is.sign) {
    return parseDecimal(parsing)
  }
  else if (parsing.currentChar.is.digit) {
    return parsing.startRule(parsing => {
      const digits = parseDigitsWithTrailingFraction(parsing)
      if (digits instanceof DMSParseError) {
        return digits
      }
      skipWhiteSpace(parsing)
      if (parsing.currentChar.is.unitLabel || parsing.currentChar.is.hemisphere) {
        return parseDmsCoordinate(parsing, digits)
      }
      return parseDecimal(parsing, digits)
    })
  }
  return parsing.error('expected hemisphere, sign, or digit')
}

function parseDmsCoordinate(parsing: ParseContext, digitsWithFractionalSeconds: string = ''): DMSCoordinate | DMSParseError {
  if (digitsWithFractionalSeconds) {
    skipWhiteSpace(parsing)
    if (parsing.currentChar.is.unitLabel) {
      /*
      the caller parsed digits, then encountered a unit to trigger the dms rule
      */
      const dmsParts = parseLabeledDmsParts(parsing, digitsWithFractionalSeconds)
      if (dmsParts instanceof DMSParseError) {
        return dmsParts
      }
      skipWhiteSpace(parsing)
      if (parsing.currentChar.is.hemisphere) {
        const hemi = parsing.consumeCurrentChar().value as HemisphereLabel
        return dmsCoordOrError(parsing, dmsParts, hemi)
      }
      return parsing.error('expected hemisphere after dms parts')
    }
    else if (parsing.currentChar.is.hemisphere) {
      /*
      the caller parsed digits, then encountered a hemisphere, so expect
      unlabeled compact dms, e.g. 112233N
      */
      const hemi = parsing.consumeCurrentChar().value as HemisphereLabel
      const dmsParts = parseUnlabeledCompactDmsParts(parsing, digitsWithFractionalSeconds)
      return dmsCoordOrError(parsing, dmsParts, hemi)
    }
  }
  else if (parsing.currentChar.is.hemisphere) {
    /*
    the caller encountered a leading hemisphere, so expect either
    labeled dms or unlabeled compact dms
    */
    const hemi = parsing.consumeCurrentChar().value as HemisphereLabel
    skipWhiteSpace(parsing)
    const expectedDigits = parseDigitsWithTrailingFraction(parsing)
    if (expectedDigits instanceof DMSParseError) {
      return expectedDigits
    }
    skipWhiteSpace(parsing)
    if (parsing.currentChar.is.unitLabel) {
      const dmsParts = parseLabeledDmsParts(parsing, expectedDigits)
      return dmsCoordOrError(parsing, dmsParts, hemi)
    }
    else {
      const dmsParts = parseUnlabeledCompactDmsParts(parsing, expectedDigits)
      return dmsCoordOrError(parsing, dmsParts, hemi)
    }
  }
  return parsing.error()
}

type DMSParts = { deg: number, min: number, sec: number }

function dmsCoordOrError(parsing: ParseContext, which: DMSParts | DMSParseError, hemi: HemisphereLabel): DMSCoordinate | DMSParseError {
  if (which instanceof DMSParseError) {
    return which
  }
  if (which.deg % 1 !== 0) {
    return parsing.error(`degrees ${which.deg} must be a whole positive integer`)
  }
  if (which.min % 1 !== 0) {
    return parsing.error(`minutes ${which.min} must be a whole positive integer`)
  }
  if (which.min >= 60) {
    return parsing.error(`minutes ${which.min} must be less than 60`)
  }
  if (which.sec >= 60) {
    return parsing.error(`seconds ${which.sec} must be less than 60`)
  }
  const coord = new DMSCoordinate(which.deg, which.min, which.sec, hemi)
  const dim = Dimension.forHemisphere(hemi)
  if (dim.excludes(coord.toDecimalDegrees())) {
    return parsing.error('coordinate out of bounds')
  }
  return new DMSCoordinate(which.deg, which.min, which.sec, hemi)
}

/**
 * Parse the rest of the labeled DMS parts after the given digits.  The current
 * character should be a DMS unit label (°|'|") that indicates the labeled DMS
 * format.
 * @param parsing the parse context
 * @param digitsWithFractionalSeconds the digits parsed before encountering a unit label
 * @returns
 */
function parseLabeledDmsParts(parsing: ParseContext, digitsWithFractionalSeconds: string): { deg: number, min: number, sec: number } | DMSParseError {
  type UnitLabel = '°' | "'" | '"'
  const allUnits = Array.from(`°'"`)
  const rankOfUnit = { '°': 0, "'": 1, '"': 2 }
  const exhaustedUnits = {} as { [U in UnitLabel]?: 1 }
  const dmsParts = { '°': null, "'": null, '"': null }
  while (parsing.currentChar.is.unitLabel) {
    const unit = parsing.consumeCurrentChar().value
    const part = Number(digitsWithFractionalSeconds)
    if (isNaN(part)) {
      return parsing.error(`invalid digits ${digitsWithFractionalSeconds}`)
    }
    if (unit in exhaustedUnits) {
      return parsing.error(`dms unit ${unit} out of order`)
    }
    allUnits.slice(0, rankOfUnit[unit] + 1).forEach(unit => exhaustedUnits[unit] = 1)
    dmsParts[unit] = part
    skipWhiteSpace(parsing)
    digitsWithFractionalSeconds = '0'
    if (parsing.currentChar.is.digit) {
      const nextDigits = parseDigitsWithTrailingFraction(parsing)
      if (nextDigits instanceof DMSParseError) {
        return nextDigits
      }
      digitsWithFractionalSeconds = nextDigits
    }
    skipWhiteSpace(parsing)
  }
  if (dmsParts['"'] === null) {
    if (parsing.finished || parsing.currentChar.is.hemisphere) {
      /*
      seconds digits without a label; not sure why anyone does this, but
      apparently unlabeled seconds is a requirement
      E 11° 22' 33
      */
      const unlabeledSeconds = Number(digitsWithFractionalSeconds)
      dmsParts['"'] = unlabeledSeconds
    }
  }
  return {
    deg: dmsParts['°'] || 0,
    min: dmsParts["'"] || 0,
    sec: dmsParts['"'] || 0,
  }
}

function parseUnlabeledCompactDmsParts(parsing: ParseContext, digitsWithFractionalSeconds: string): DMSParts | DMSParseError {
  const [ whole, frac ] = digitsWithFractionalSeconds.split('.')
  const sec = Number(whole.slice(-2) + (frac ? `.${frac}` : ''))
  const min = Number(whole.slice(-4, -2))
  const deg = Number(whole.slice(0, -4))
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

function parseDigitsWithTrailingFraction(parsing: ParseContext): string | DMSParseError {
  const whole = parseDigits(parsing)
  if (whole instanceof DMSParseError) {
    return whole
  }
  if (!parsing.currentChar.is.dot) {
    return whole
  }
  const frac = parseDigits(parsing.advanceCursor())
  if (frac instanceof DMSParseError) {
    return frac
  }
  return `${whole}.${frac}`
}

function parseDecimal(parsing: ParseContext, digitsWithFraction: string = ''): number | DMSParseError {
  if (digitsWithFraction) {
    return Number(digitsWithFraction)
  }
  const sign = parsing.currentChar.is.sign ? parsing.consumeCurrentChar().value : ''
  const digits = parseDigitsWithTrailingFraction(parsing)
  if (digits instanceof DMSParseError) {
    return digits
  }
  return Number(`${sign}${digits}`)
}

function skipWhiteSpace(parsing: ParseContext): number {
  const start = parsing.pos
  while (parsing.currentChar.is.space) {
    parsing.advanceCursor()
  }
  return parsing.pos - start
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
