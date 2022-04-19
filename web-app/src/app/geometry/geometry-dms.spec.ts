import { DMS } from './geometry-dms';

describe('DMS', () => {
  it('should parse the coordinate string to a DMS string', () => {
    expect(DMS.parseToDMSString(null)).toEqual('')
    
    let coordinates = "112230N"
    expect(DMS.parseToDMSString(coordinates)).toEqual("11° 22' 30\" N")

    coordinates = "112230"
    expect(DMS.parseToDMSString(coordinates)).toEqual("11° 22' 30\" ")

    coordinates = "30N"
    expect(DMS.parseToDMSString(coordinates)).toEqual("30° N")

    coordinates = "3030N"
    expect(DMS.parseToDMSString(coordinates)).toEqual("30° 30' N")

    coordinates = "purple"
    expect(DMS.parseToDMSString(coordinates)).toEqual("E")

    coordinates = ""
    expect(DMS.parseToDMSString(coordinates)).toEqual("")

    coordinates = "N 11 ° 22'30 \""
    expect(DMS.parseToDMSString(coordinates)).toEqual("11° 22' 30\" N")

    coordinates = "N 11 ° 22'30.36 \""
    expect(DMS.parseToDMSString(coordinates)).toEqual("11° 22' 30\" N")

    coordinates = "112233.99N"
    expect(DMS.parseToDMSString(coordinates)).toEqual("11° 22' 34\" N")

    coordinates = "11.999999N"
    expect(DMS.parseToDMSString(coordinates)).toEqual("12° 00' 00\" N")

    coordinates = "N 11 ° 22'30.remove \""
    expect(DMS.parseToDMSString(coordinates)).toEqual("11° 22' 30\" N")

    coordinates = "11 ° 22'30 \"N"
    expect(DMS.parseToDMSString(coordinates)).toEqual("11° 22' 30\" N")

    coordinates = "11° 22'30 N"
    expect(DMS.parseToDMSString(coordinates)).toEqual("11° 22' 30\" N")

    coordinates = "101° 22'30 W"
    expect(DMS.parseToDMSString(coordinates)).toEqual("101° 22' 30\" W")

    coordinates = "11"
    expect(DMS.parseToDMSString(coordinates)).toEqual("11° ")

    coordinates = "11.4584"
    expect(DMS.parseToDMSString(coordinates, true, true)).toEqual("11° 27' 30\" N")

    coordinates = "-11.4584"
    expect(DMS.parseToDMSString(coordinates, true, true)).toEqual("11° 27' 30\" S")

    coordinates = "11.4584"
    expect(DMS.parseToDMSString(coordinates, true)).toEqual("11° 27' 30\" E")

    coordinates = "-11.4584"
    expect(DMS.parseToDMSString(coordinates, true)).toEqual("11° 27' 30\" W")

    coordinates = "11.4584"
    expect(DMS.parseToDMSString(coordinates, true, true)).toEqual("11° 27' 30\" N")

    coordinates = "-11.4584"
    expect(DMS.parseToDMSString(coordinates, true, true)).toEqual("11° 27' 30\" S")

    coordinates = "0151545W"
    expect(DMS.parseToDMSString(coordinates)).toEqual("15° 15' 45\" W")

    coordinates = "113000W"
    expect(DMS.parseToDMSString(coordinates)).toEqual("11° 30' 00\" W")

    coordinates = "W 15 ° 15'45"
    expect(DMS.parseToDMSString(coordinates)).toEqual("15° 15' 45\" W")

    coordinates = "15 ° 15'45\" W"
    expect(DMS.parseToDMSString(coordinates)).toEqual("15° 15' 45\" W")

    coordinates = "015° 15'45 W"
    expect(DMS.parseToDMSString(coordinates)).toEqual("15° 15' 45\" W")

    coordinates = "15.6827"
    expect(DMS.parseToDMSString(coordinates)).toEqual("15° 40' 58\" ")

    coordinates = "-15.6827"
    expect(DMS.parseToDMSString(coordinates)).toEqual("15° 40' 58\" ")

    coordinates = "15.6827"
    expect(DMS.parseToDMSString(coordinates, true)).toEqual("15° 40' 58\" E")

    coordinates = "-15.6827"
    expect(DMS.parseToDMSString(coordinates, true)).toEqual("15° 40' 58\" W")

    coordinates = "113000NNNN"
    expect(DMS.parseToDMSString(coordinates)).toEqual("11° 30' 00\" N")
  });

  it("should split the coordinate string", () => {
    expect(DMS.splitCoordinates(null)).toEqual([])
    
    let coordinates = "112233N 0152144W"
    expect(DMS.splitCoordinates(coordinates)).toEqual(["112233N","0152144W"])

    coordinates = "N 11 ° 22'33 \"- W 15 ° 21'44"
    expect(DMS.splitCoordinates(coordinates)).toEqual(["N11°22'33\"","W15°21'44"])
    
    coordinates = "N 11 ° 22'30 \""
    expect(DMS.splitCoordinates(coordinates)).toEqual(["N11°22'30\""])

    coordinates = "11 ° 22'33 \"N - 15 ° 21'44\" W"
    expect(DMS.splitCoordinates(coordinates)).toEqual(["11°22'33\"N","15°21'44\"W"])

    coordinates = "11° 22'33 N 015° 21'44 W"
    expect(DMS.splitCoordinates(coordinates)).toEqual(["11°22'33N","015°21'44W"])

    coordinates = "11.4584 15.6827"
    expect(DMS.splitCoordinates(coordinates)).toEqual(["11.4584","15.6827"])

    coordinates = "-11.4584 15.6827"
    expect(DMS.splitCoordinates(coordinates)).toEqual(["-11.4584","15.6827"])

    coordinates = "11.4584 -15.6827"
    expect(DMS.splitCoordinates(coordinates)).toEqual(["11.4584","-15.6827"])

    coordinates = "11.4584, 15.6827"
    expect(DMS.splitCoordinates(coordinates)).toEqual(["11.4584","15.6827"])

    coordinates = "-11.4584, 15.6827"
    expect(DMS.splitCoordinates(coordinates)).toEqual(["-11.4584","15.6827"])

    coordinates = "11.4584, -15.6827"
    expect(DMS.splitCoordinates(coordinates)).toEqual(["11.4584","-15.6827"])
  });

  it("should parse the coordinate string", () => {
    expect(DMS.parse(null)).toBeNaN()
    
    let coordinates = "112230N"
    expect(DMS.parse(coordinates)).toEqual(11.375)
    
    coordinates = "112230"
    expect(DMS.parse(coordinates)).toEqual(11.375)
    
    coordinates = "purple"
    expect(DMS.parse(coordinates)).toBeNaN()
    
    coordinates = "N 11 ° 22'30 \""
    expect(DMS.parse(coordinates)).toEqual(11.375)
    
    coordinates = "N 11 ° 22'30.36 \""
    expect(DMS.parse(coordinates)).toEqual(11.375)
    
    coordinates = "N 11 ° 22'30.remove \""
    expect(DMS.parse(coordinates)).toEqual(11.375)

    coordinates = "11 ° 22'30 \"N"
    expect(DMS.parse(coordinates)).toEqual(11.375)

    coordinates = "11° 22'30 N"
    expect(DMS.parse(coordinates)).toEqual(11.375)

    coordinates = "11.4584"
    expect(DMS.parse(coordinates)).toEqual(11.4584)

    coordinates = "-11.4584"
    expect(DMS.parse(coordinates)).toEqual(-11.4584)

    coordinates = "0151545W"
    expect(DMS.parse(coordinates)).toEqual(-15.2625)

    coordinates = "W 15 ° 15'45"
    expect(DMS.parse(coordinates)).toEqual(-15.2625)

    coordinates = "15 ° 15'45\" W"
    expect(DMS.parse(coordinates)).toEqual(-15.2625)

    coordinates = "015° 15'45 W"
    expect(DMS.parse(coordinates)).toEqual(-15.2625)

    coordinates = "15.6827"
    expect(DMS.parse(coordinates)).toEqual(15.6827)

    coordinates = "-15.6827"
    expect(DMS.parse(coordinates)).toEqual(-15.6827)

    coordinates = "0° 30' 00\" S"
    expect(DMS.parse(coordinates)).toEqual(-0.5)
  });

  it("should parse to DMS", () => {
    const coordinate = "113000NNNN"
    const parsed = DMS.parseDMS(coordinate)
    expect(parsed.direction).toEqual("N")
    expect(parsed.seconds).toEqual(0)
    expect(parsed.minutes).toEqual(30)
    expect(parsed.degrees).toEqual(11)
  });

  it("should validate DMS latitude input", () => {
    expect(DMS.validateLatitudeFromDMS(null)).toBeFalsy()
    expect(DMS.validateLatitudeFromDMS("NS1122N")).toBeFalsy()
    expect(DMS.validateLatitudeFromDMS("002233.NS")).toBeFalsy()
    expect(DMS.validateLatitudeFromDMS("ABCDEF.NS")).toBeFalsy()
    expect(DMS.validateLatitudeFromDMS("11NSNS.1N")).toBeFalsy()
    expect(DMS.validateLatitudeFromDMS("1111NS.1N")).toBeFalsy()
    expect(DMS.validateLatitudeFromDMS("113000NNN")).toBeFalsy()
    
    let validString = "112233N"
    expect(DMS.validateLatitudeFromDMS(validString)).toBeTruthy()
    validString = "002233N"
    expect(DMS.validateLatitudeFromDMS(validString)).toBeTruthy()
    validString = "02233N"
    expect(DMS.validateLatitudeFromDMS(validString)).toBeTruthy()
    validString = "12233N"
    expect(DMS.validateLatitudeFromDMS(validString)).toBeTruthy()
    validString = "002233S"
    expect(DMS.validateLatitudeFromDMS(validString)).toBeTruthy()
    validString = "002233.2384S"
    expect(DMS.validateLatitudeFromDMS(validString)).toBeTruthy()
    validString = "1800000E"
    expect(DMS.validateLongitudeFromDMS(validString)).toBeTruthy()
    validString = "1800000W"
    expect(DMS.validateLongitudeFromDMS(validString)).toBeTruthy()
    validString = "900000S"
    expect(DMS.validateLatitudeFromDMS(validString)).toBeTruthy()
    validString = "900000N"
    expect(DMS.validateLatitudeFromDMS(validString)).toBeTruthy()
    validString = "104° 40' 05\" E"
    expect(DMS.validateLongitudeFromDMS(validString)).toBeTruthy()

    let invalidString = "2233N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "33N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "2N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "233N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = ".123N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = ""
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()

    invalidString = "2233W"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "33W"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "2W"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "233W"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "W"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = ".123W"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = ""
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()

    invalidString = "112233"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "1a2233N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "1a2233N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "11a233N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "1122a3N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "912233N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "-112233N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "116033N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "112260N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()

    invalidString = "1812233W"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "-112233W"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "002233E"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "002233N"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "1800001E"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "1800000.1E"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "1800001W"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "1800000.1W"
    expect(DMS.validateLongitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "900001N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "900000.1N"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "900001S"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "900000.1S"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "108900S"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
    invalidString = "100089S"
    expect(DMS.validateLatitudeFromDMS(invalidString)).toBeFalsy()
  });

  it("should return a latitude dms string", () => {
    let coordinate = 11.1
    expect(DMS.latitudeDMSString(coordinate)).toEqual("11° 06' 00\" N")
    coordinate = -11.1
    expect(DMS.latitudeDMSString(coordinate)).toEqual("11° 06' 00\" S")
  });

  it("should return a longitude dms string", () => {
    let coordinate = 11.1
    expect(DMS.longitudeDMSString(coordinate)).toEqual("11° 06' 00\" E")
    coordinate = -11.1
    expect(DMS.longitudeDMSString(coordinate)).toEqual("11° 06' 00\" W")
    
    coordinate = 18.077251
    expect(DMS.longitudeDMSString(coordinate)).toEqual("18° 04' 38\" E")
  });
});