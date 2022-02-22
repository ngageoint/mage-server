import { LatLng } from "leaflet";

export class DMSCoordinate {
    degrees: number;
    minutes: number;
    seconds: number;
    direction: string;
}

export class DMS {

  static parseToLatLng(coordinates: string): LatLng {
    const location = new LatLng(NaN, NaN)

    const split = DMS.splitCoordinates(coordinates)
    if (split.length === 2) {
      const latitude = DMS.parse(split[0], true)
      if (!isNaN(latitude)) {
        location.lat = latitude
      }
      const longitude = DMS.parse(split[1], false)
      if (!isNaN(longitude)) {
        location.lng = longitude
      }
    } else if (split.length == 1) {
      const coordinate = DMS.parse(split[0], false)
      if (!isNaN(coordinate)) {
        location.lng = coordinate
      }
    }
    return location
  }

  // takes one coordinate and translates it into a CLLocationDegrees
  // returns NaN if nothing can be parsed
  static parse(coordinate: string, enforceLatitude = false): number {
    if (!coordinate) {
      return NaN
    }

    const normalized = coordinate.replace(/\r?\n|\r|\s/g, "")
    // check if it is a number and that number could be a valid latitude or longitude
    // could either be a decimal or a whole number representing lat/lng or a DDMMSS.sss number representing degree minutes seconds
    const decimalDegrees = Number(normalized)
    if (!isNaN(decimalDegrees)) {
      // if either of these are true, parse it as a regular latitude longitude
      if ((!enforceLatitude && decimalDegrees >= -180.0 && decimalDegrees <= 180.0)
        || (enforceLatitude && decimalDegrees >= 90.0 && decimalDegrees <= 90.0)) {
          return decimalDegrees
      }
    }

    // try to just parse it as DMS
    const dms = DMS.parseDMS(normalized)
    if (dms.degrees) {
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

  static firstDirectionIndex(coordinateString): number {
    let firstDirectionIndex = coordinateString.indexOf('N')
    if (firstDirectionIndex == -1) {
      firstDirectionIndex = coordinateString.indexOf('S')
    }
    if (firstDirectionIndex == -1) {
      firstDirectionIndex = coordinateString.indexOf('E')
    }
    if (firstDirectionIndex == -1) {
      firstDirectionIndex = coordinateString.indexOf('W')
    }
    return firstDirectionIndex
  }

  static lastDirectionIndex(coordinateString): number {
    let lastDirectionIndex = coordinateString.lastIndexOf('N')
    if (lastDirectionIndex == -1) {
      lastDirectionIndex = coordinateString.lastIndexOf('S')
    }
    if (lastDirectionIndex == -1) {
      lastDirectionIndex = coordinateString.lastIndexOf('E')
    }
    if (lastDirectionIndex == -1) {
      lastDirectionIndex = coordinateString.lastIndexOf('W')
    }
    return lastDirectionIndex
  }

  // splits the string into possibly two coordinates with all spaces removed
  // no further normalization takes place
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
    const firstDirectionIndex = DMS.firstDirectionIndex(coordinatesToParse)
    const hasDirection = firstDirectionIndex !== -1

    // if the string has a direction we can try to split on the dash
    if (hasDirection && coordinatesToParse.indexOf('-') !== -1) {
      return coordinatesToParse.split('-').map(splitString => splitString.replace(/\r?\n|\r|\s/g, ''))
    } else if (hasDirection) {
      // if the string has a direction but no dash, split on the direction
      const lastDirectionIndex = DMS.lastDirectionIndex(coordinatesToParse)

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
          split.push(coordinatesToParse.substring(0, firstDirectionIndex))
          split.push(coordinatesToParse.substring(firstDirectionIndex))
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

  // Need to parse the following formats: 
  // 1. 112233N 0112244W
  // 2. N 11 ° 22'33 "- W 11 ° 22'33
  // 3. 11 ° 22'33 "N - 11 ° 22'33" W
  // 4. 11° 22'33 N 011° 22'33 W
  static parseDMS(coordinate: string, addDirection = false, latitude = false): DMSCoordinate {
    const dmsCoordinate = new DMSCoordinate()

    let coordinateToParse = coordinate.replace(/\r?\n|\r|\s/g, '')

    if (addDirection) {
      // check if the first character is negative
      if (coordinateToParse.indexOf('-') === 0) {
        dmsCoordinate.direction = latitude ? 'S' : 'W'
      } else {
        dmsCoordinate.direction = latitude ? 'N' : 'E'
      }
    }

    // strip out any non numerics except direction
    coordinateToParse = coordinateToParse.replace(/[^\d.NSEWnsew]/g, '')

    const lastCharacter = coordinateToParse[coordinateToParse.length - 1]
    if (!isNaN(Number(lastCharacter))) {
      // the last character might be a direction not a number
      dmsCoordinate.direction = lastCharacter.toUpperCase()
      coordinateToParse = coordinateToParse.slice(0, -1)
    }
    const firstCharacter = coordinateToParse[0]
    if (!isNaN(Number(firstCharacter))) {
      // the first character might be a direction not a number
      dmsCoordinate.direction = firstCharacter.toUpperCase()
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

    dmsCoordinate.seconds = Number(coordinateToParse.slice(-2))
    coordinateToParse = coordinateToParse.slice(0, -2)

    dmsCoordinate.minutes = Number(coordinateToParse.slice(-2))
    dmsCoordinate.degrees = Number(coordinateToParse.slice(0, -2))

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
      const decimalRemainderOfMinutes = Number(((decimal * 60.0)+"").split(".")[1])
      const seconds = Math.abs(decimalRemainderOfMinutes)
      dmsCoordinate.seconds = Math.round(seconds)
    } else if (decimalSeconds !== null && isNaN(decimalSeconds)) {
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

  static validateLatitudeFromDMS(latitude: string): boolean {
    return DMS.validateCoordinateFromDMS(latitude, true)
  }

  static validateLongitudeFromDMS(longitude: string): boolean {
    return DMS.validateCoordinateFromDMS(longitude, false)
  }

  static validateCoordinateFromDMS(coordinate: string, latitude: boolean): boolean {
    if (!coordinate) {
      return false
    }

    const letters = /^[0-9NSEWnsew. °\'\"]+$/;
    if (!letters.test(coordinate)) {
      return false
    }

    let coordinateToParse = coordinate.replace(/[^\d.NSEWnsew]/g, '')

    // There must be a direction as the last character
    const direction = coordinateToParse[coordinateToParse.length - 1]
    if (isNaN(Number(direction))) {
      return false
    } else {
      // i don't think this is right
      if (latitude && direction.toUpperCase() !== 'N' && direction.toUpperCase() !== 'S') {
        return false
      }
      if (!latitude && direction.toUpperCase() !== 'E' && direction.toUpperCase() !== 'W') {
        return false
      }
      coordinateToParse = coordinateToParse.slice(-1)
    }

    // split the numbers before the decimal seconds
    const split = coordinateToParse.split('.')
    if (split.length === 0) {
      return false
    }

    coordinateToParse = split[0]

    // there must be either 5 or 6 digits for latitude (1 or 2 degrees, 2 minutes, 2 seconds)
    // or 5, 6, 7 digits for longitude
    if (latitude && (coordinateToParse.length < 5 || coordinateToParse.length > 6)) {
      return false
    }
    if (!latitude && (coordinateToParse.length < 5 || coordinateToParse.length > 7)) {
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

    const minutes = Number(coordinateToParse.slice(2))
    const degrees = Number(coordinateToParse.slice(0, -2))

    if (!isNaN(degrees)) {
      if (latitude && (degrees < 0 || degrees > 90)) {
        return false
      }
      if (!latitude && (degrees < 0 || degrees > 180)) {
        return false
      }
    } else {
      return false
    }

    if (!isNaN(minutes) && !isNaN(degrees)) {
      if ((minutes < 0 || minutes > 59) || (latitude && degrees == 90 && minutes != 0) || (!latitude && degrees == 180 && minutes != 0)) {
        return false
      }
    } else {
      return false
    }

    if (!isNaN(seconds) && !isNaN(degrees)) {
      if ((seconds < 0 || seconds > 59) || (latitude && degrees == 90 && (seconds != 0|| decimalSeconds != 0)) || (!latitude && degrees == 180 && (seconds != 0 || decimalSeconds != 0))) {
        return false
      }
    } else {
      return false
    }

    return true
  }

  static parseToDMSString(string: string, addDirection= false, latitude = false): string {
    if (!string) {
      return null
    }

    if (string.length === 0) {
      return ''
    }

    const parsed = DMS.parseDMS(string, addDirection, latitude)

    const direction = parsed.direction ? parsed.direction : ''

    let seconds = parsed.seconds ? DMS.zeroPad(parsed.seconds) : ''
    let minutes = parsed.minutes ? DMS.zeroPad(parsed.minutes) : ''
    let degrees = parsed.degrees ? '' + parsed.degrees : ''

    if (degrees.length !== 0) {
      degrees = degrees + '° '
    }
    if (minutes.length !== 0) {
      minutes = minutes + "' "
    }
    if (seconds.length !== 0) {
      seconds = seconds + '" '
    }

    return degrees + minutes + seconds + direction
  }

  static zeroPad(number: number): string {
    return ('00' + number).slice(-2)
  }

  static decimalPart(number: number): number {
    return Number("."+(number+"").split(".")[1])
  }

  static latitudeDMSString(coordinate: number): string {
    console.log('coordinate', coordinate)
    console.log('decimal part', DMS.decimalPart(coordinate))
    let latDegrees = Math.floor(coordinate)
    let latMinutes = Math.floor(Math.abs(DMS.decimalPart(coordinate) * 60.0))
    console.log('lat minutes', latMinutes)
    console.log('firstdecimal part ' + DMS.decimalPart(coordinate))
    console.log('(should be lat minutes) times 60', DMS.decimalPart(coordinate) * 60.0)
    console.log("" + DMS.decimalPart(DMS.decimalPart(coordinate) * 60.0) * 60.0)
    let latSeconds = Math.round(Math.abs(DMS.decimalPart(DMS.decimalPart(coordinate) * 60.0)) * 60.0)
    if (latSeconds == 60) {
      latSeconds = 0
      latMinutes += 1
    }
    if (latMinutes == 60) {
      latDegrees += 1
      latMinutes = 0
    }

    return `${Math.abs(latDegrees)}° ${DMS.zeroPad(latMinutes)}' ${DMS.zeroPad(latSeconds)}" ${latDegrees >= 0 ? 'N' : 'S'}`
  }

  static longitudeDMSString(coordinate: number): string {
    let latDegrees = Math.floor(coordinate)
    let latMinutes = Math.floor(Math.abs(DMS.decimalPart(coordinate) * 60.0))
    let latSeconds = Math.round(Math.abs(DMS.decimalPart(DMS.decimalPart(coordinate) * 60.0)) * 60.0)
    if (latSeconds == 60) {
      latSeconds = 0
      latMinutes += 1
    }
    if (latMinutes == 60) {
      latDegrees += 1
      latMinutes = 0
    }

    return `${Math.abs(latDegrees)}° ${DMS.zeroPad(latMinutes)}' ${DMS.zeroPad(latSeconds)}" ${latDegrees >= 0 ? 'E' : 'W'}`
  }
}