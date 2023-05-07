
class DMSCoordinate {

  degrees?: number;
  minutes?: number;
  seconds?: number;
  direction: HemisphereLabel;

  format(opts: DMSFormatOptions = { hemisphereIndicator: 'label', padDegrees: true }): string {
    return formatDMS(this, opts)
  }

  toString() {
    return this.format()
  }

  static fromDegrees(deg: number, dimension?: DimensionKey) {

  }
}

export interface DMSFormatOptions {
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
   * @param input
   * @param enforceLatitude
   * @returns
   */
  static parse(input: string, dimension: DimensionKey): number {
    if (!input) {
      return NaN
    }

    const normalized = input.replace(/\r?\n|\r|\s/g, "")
    // check if it is a number and that number could be a valid latitude or longitude
    // could either be a decimal or a whole number representing lat/lng or a DDMMSS.sss number representing degree minutes seconds
    const decimalDegrees = Number(normalized)
    if (!isNaN(decimalDegrees)) {
      if (
        (dimension === DimensionKey.Longitude && decimalDegrees >= -180.0 && decimalDegrees <= 180.0) ||
        (dimension === DimensionKey.Latitude && decimalDegrees >= -90.0 && decimalDegrees <= 90.0)
      ) {
          return decimalDegrees
      }
    }

    const dms = parseDMS(normalized, dimension)
    if (dms.degrees || dms.degrees === 0) {
      let coordinateDegrees = dms.degrees
      if (dms.minutes) {
        coordinateDegrees += dms.minutes / 60.0
      }
      if (dms.seconds) {
        coordinateDegrees += dms.seconds / 3600.0
      }
      if (dms.direction) {
        if (dms.direction == "S" || dms.direction == "W") {
          coordinateDegrees *= -1
        }
      }

      return coordinateDegrees
    }

    return NaN
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

    // trim whitespaces from the start and end of the string
    const coordinatesToParse = coordinates.trim().toUpperCase()

    // if there is a comma, split on that
    if (coordinatesToParse.includes(',')) {
      return coordinatesToParse.split(',').map(splitString => splitString.replace(/\r?\n|\r|\s/g, ''))
    }

    // check if there are any direction letters
    const firstDirectionIndex = indexOfFirstHemisphere(coordinatesToParse)
    const hasDirection = firstDirectionIndex !== -1

    // if the string has a direction we can try to split on the dash
    if (hasDirection && coordinatesToParse.indexOf('-') !== -1) {
      return coordinatesToParse.split('-').map(splitString => splitString.replace(/\r?\n|\r|\s/g, ''))
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

  static validateLatitudeFromDMS(dmsLat: string): boolean {
    return validateCoordinateFromDMS(dmsLat, DimensionKey.Latitude)
  }

  static validateLongitudeFromDMS(dmsLon: string): boolean {
    return validateCoordinateFromDMS(dmsLon, DimensionKey.Longitude)
  }

  static formatLatitude(degrees: number): string {
    return formatDegrees(degrees, DimensionKey.Latitude)
  }

  static formatLongitude(degrees: number): string {
    return formatDegrees(degrees, DimensionKey.Longitude)
  }
}

function parseDMS(coordinate: string, dimKey: DimensionKey): DMSCoordinate {
  const dmsCoordinate = new DMSCoordinate()
  const dim = Dimension[dimKey]
  let coordinateToParse = coordinate.replace(/\r?\n|\r|\s/g, '')

  // check if the first character is negative
  if (coordinateToParse.indexOf('-') === 0) {
    dmsCoordinate.direction = dim.hemisphereForDegrees(-1)
  } else {
    dmsCoordinate.direction = dim.hemisphereForDegrees(1)
  }

  // strip out any non numerics except direction
  coordinateToParse = coordinateToParse.replace(/[^\d.NSEWnsew]/g, '')
  if (coordinateToParse.length == 0) {
    return dmsCoordinate
  }

  const lastCharacter = coordinateToParse[coordinateToParse.length - 1]
  if (lastCharacter && isNaN(Number(lastCharacter))) {
    // the last character might be a direction not a number
    dmsCoordinate.direction = lastCharacter.toUpperCase() as HemisphereLabel
    coordinateToParse = coordinateToParse.slice(0, -1)
  }
  if (coordinateToParse.length == 0) {
    return dmsCoordinate
  }

  const firstCharacter = coordinateToParse[0]
  if (firstCharacter && isNaN(Number(firstCharacter))) {
    // the first character might be a direction not a number
    dmsCoordinate.direction = firstCharacter.toUpperCase() as HemisphereLabel
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
  const dim = Dimension.forHemisphere(coord.direction)
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

function validateCoordinateFromDMS(dmsCoordinate: string, dimension: DimensionKey): boolean {
  if (!dmsCoordinate) {
    return false
  }
  const letters = /^[0-9NSEWnsew. °\'\"]+$/;
  if (!letters.test(dmsCoordinate)) {
    return false
  }

  let coordinateToParse = dmsCoordinate.replace(/[^\d.NSEWnsew]/g, '')

  // There must be a direction as the last character
  const direction = coordinateToParse[coordinateToParse.length - 1]
  if (!isNaN(Number(direction))) {
    return false
  } else {
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
  },
  [DimensionKey.Longitude]: {
    hemisphereForDegrees: (deg: number) => (deg < 0 ? 'W' : 'E') as LongitudeHemisphereLabel,
    zeroPadDegrees: (deg: number) => zeroPadStart(deg, 3),
  },
  keyForHemisphere: (hemi: HemisphereLabel) => hemi === 'E' || hemi === 'W' ? DimensionKey.Longitude : DimensionKey.Latitude,
  forHemisphere: (hemi: HemisphereLabel) => Dimension[Dimension.keyForHemisphere(hemi)],
} as const

type LatitudeHemisphereLabel = 'N' | 'S'
type LongitudeHemisphereLabel = 'E' | 'W'
type HemisphereLabel = LatitudeHemisphereLabel | LongitudeHemisphereLabel


