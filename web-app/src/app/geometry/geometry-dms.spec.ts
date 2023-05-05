import { DMS } from './geometry-dms';

fdescribe('DMS', () => {

  it('should parse the coordinate string to a DMS string', () => {

    expect(DMS.parseToDMSString(null)).toEqual('')

    let coordinates = `112230N`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`11° 22' 30" N`)

    coordinates = `112230`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`11° 22' 30" `)

    coordinates = `30N`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`30° N`)

    coordinates = `3030N`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`30° 30' N`)

    coordinates = `purple`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`E`)

    coordinates = ``
    expect(DMS.parseToDMSString(coordinates)).toEqual(``)

    coordinates = `N 11 ° 22'30 `
    expect(DMS.parseToDMSString(coordinates)).toEqual(`11° 22' 30" N`)

    coordinates = `N 11 ° 22'30.36 `
    expect(DMS.parseToDMSString(coordinates)).toEqual(`11° 22' 30" N`)

    coordinates = `112233.99N`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`11° 22' 34" N`)

    coordinates = `11.999999N`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`12° 00' 00" N`)

    coordinates = `N 11 ° 22'30.remove `
    expect(DMS.parseToDMSString(coordinates)).toEqual(`11° 22' 30" N`)

    coordinates = `11 ° 22'30 "N`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`11° 22' 30" N`)

    coordinates = `11° 22'30 N`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`11° 22' 30" N`)

    coordinates = `101° 22'30 W`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`101° 22' 30" W`)

    coordinates = `11`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`11° `)

    coordinates = `11.4584`
    expect(DMS.parseToDMSString(coordinates, true, true)).toEqual(`11° 27' 30" N`)

    coordinates = `-11.4584`
    expect(DMS.parseToDMSString(coordinates, true, true)).toEqual(`11° 27' 30" S`)

    coordinates = `11.4584`
    expect(DMS.parseToDMSString(coordinates, true)).toEqual(`11° 27' 30" E`)

    coordinates = `-11.4584`
    expect(DMS.parseToDMSString(coordinates, true)).toEqual(`11° 27' 30" W`)

    coordinates = `11.4584`
    expect(DMS.parseToDMSString(coordinates, true, true)).toEqual(`11° 27' 30" N`)

    coordinates = `-11.4584`
    expect(DMS.parseToDMSString(coordinates, true, true)).toEqual(`11° 27' 30" S`)

    coordinates = `0151545W`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`15° 15' 45" W`)

    coordinates = `113000W`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`11° 30' 00" W`)

    coordinates = `W 15 ° 15'45`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`15° 15' 45" W`)

    coordinates = `15 ° 15'45" W`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`15° 15' 45" W`)

    coordinates = `015° 15'45 W`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`15° 15' 45" W`)

    coordinates = `15.6827`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`15° 40' 58" `)

    coordinates = `-15.6827`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`15° 40' 58" `)

    coordinates = `15.6827`
    expect(DMS.parseToDMSString(coordinates, true)).toEqual(`15° 40' 58" E`)

    coordinates = `-15.6827`
    expect(DMS.parseToDMSString(coordinates, true)).toEqual(`15° 40' 58" W`)

    coordinates = `113000NNNN`
    expect(DMS.parseToDMSString(coordinates)).toEqual(`11° 30' 00" N`)
  });

  it('should split the coordinate string', () => {
    expect(DMS.splitCoordinates(null)).toEqual([])
    expect(DMS.splitCoordinates(`112233N 0152144W`)).toEqual([ `112233N`, `0152144W` ])
    expect(DMS.splitCoordinates(`N 11 ° 22'33 "- W 15 ° 21'44`)).toEqual([ `N11°22'33"`, `W15°21'44`])
    expect(DMS.splitCoordinates(`N 11 ° 22'30 `)).toEqual([ `N11°22'30"` ])
    expect(DMS.splitCoordinates(`11 ° 22'33 "N - 15 ° 21'44" W`)).toEqual([ `11°22'33\"N`, `15°21'44"W` ])
    expect(DMS.splitCoordinates(`11° 22'33 N 015° 21'44 W`)).toEqual([ "11°22'33N", "015°21'44W" ])
    expect(DMS.splitCoordinates(`11.4584 15.6827`)).toEqual([ "11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`-11.4584 15.6827`)).toEqual([ "-11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`11.4584 -15.6827`)).toEqual([ "11.4584", "-15.6827" ])
    expect(DMS.splitCoordinates(`11.4584, 15.6827`)).toEqual([ "11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`-11.4584, 15.6827`)).toEqual([ "-11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`11.4584, -15.6827`)).toEqual([ "11.4584", "-15.6827" ])
  });

  it('should parse the coordinate string', () => {
    expect(DMS.parse(null)).toBeNaN()
    expect(DMS.parse(`112230N`)).toEqual(11.375)
    expect(DMS.parse(`N 11 ° 22'30.36 `)).toEqual(11.375)
    expect(DMS.parse(`N 11 ° 22'30.remove `)).toEqual(11.375)
    expect(DMS.parse(`11 ° 22'30 "N`)).toEqual(11.375)
    expect(DMS.parse(`11° 22'30 N`)).toEqual(11.375)
    expect(DMS.parse(`11.4584`)).toEqual(11.4584)
    expect(DMS.parse(`-11.4584`)).toEqual(-11.4584)
    expect(DMS.parse(`0151545W`)).toEqual(-15.2625)
    expect(DMS.parse(`W 15 ° 15'45`)).toEqual(-15.2625)
    expect(DMS.parse(`15 ° 15'45" W`)).toEqual(-15.2625)
    expect(DMS.parse(`015° 15'45 W`)).toEqual(-15.2625)
    expect(DMS.parse(`15.6827`)).toEqual(15.6827)
    expect(DMS.parse(`-15.6827`)).toEqual(-15.6827)
    expect(DMS.parse(`0° 30' 00" S`)).toEqual(-0.5)
    expect(DMS.parse(`1° 00' 00" E`, false)).toEqual(1.0)
    expect(DMS.parse(`1° 00' 00" W`, false)).toEqual(-1.0)
    expect(DMS.parse(`0° 30' 00" E`, false)).toEqual(0.5)
    expect(DMS.parse(`0° 30' 00" W`, false)).toEqual(-0.5)
  });

  it('should parse to DMS', () => {
    const coordinate = `113000NNNN`
    const parsed = DMS.parseDMS(coordinate)
    expect(parsed.direction).toEqual(`N`)
    expect(parsed.seconds).toEqual(0)
    expect(parsed.minutes).toEqual(30)
    expect(parsed.degrees).toEqual(11)
  });

  describe('validation', () => {

    describe('valid latitudes', () => {

      [
        `112233N`,
        `002233N`,
        `02233N`,
        `12233N`,
        `002233S`,
        `002233.2384S`,
        `900000S`,
        `900000N`,
      ]
      .forEach(input => {
        it(`validates latitude ${input}`, () => {
          expect(DMS.validateLatitudeFromDMS(input)).toBeTruthy()
        })
      })
    })

    describe('invalid latitudes', () => {

      [
        null,
        undefined,
        ``,
        `NS1122N`,
        `002233.NS`,
        `ABCDEF.NS`,
        `11NSNS.1N`,
        `1111NS.1N`,
        `113000NNN`,
        `2233N`,
        `33N`,
        `2N`,
        `233N`,
        `N`,
        `.123N`,
        `900001N`,
        `900000.1N`,
        `900001S`,
        `900000.1S`,
        `108900S`,
        `100089S`,
        `112233`,
        `1a2233N`,
        `1a2233N`,
        `11a233N`,
        `1122a3N`,
        `912233N`,
        `-112233N`,
        `116033N`,
        `112260N`,
      ]
      .forEach(input => {
        it(`invalidates latitude ${input}`, () => {
          expect(DMS.validateLatitudeFromDMS(input)).toBeFalsy()
        })
      })
    })

    describe('valid longitudes', () => {
      [
        `104° 40' 05" E`,
        `1800000E`,
        `1800000W`,
      ]
      .forEach(input => {
        it(`validates longitude ${input}`, () => {
          expect(DMS.validateLongitudeFromDMS(input)).toBeTruthy()
        })
      })
    })

    describe('invalid longitudes', () => {
      [
        null,
        ``,
        `2233W`,
        `33W`,
        `2W`,
        `233W`,
        `W`,
        `.123W`,
        `1812233W`,
        `-112233W`,
        `002233E`,
        `002233N`,
        `1800001E`,
        `1800000.1E`,
        `1800001W`,
        `1800000.1W`,
      ]
      .forEach(input => {
        it(`invalidates longitude ${input}`, () => {
          expect(DMS.validateLongitudeFromDMS(input)).toBeFalsy()
        })
      })
    })
  })

  it('formats a latitude as dms', () => {
    expect(DMS.formatLatitude(11.1)).toEqual(`11° 06' 00" N`)
    expect(DMS.formatLatitude(-11.1)).toEqual(`11° 06' 00" S`)
    expect(DMS.formatLatitude(1.25)).toEqual(`01° 15' 00" N`)
    expect(DMS.formatLatitude(-1.25)).toEqual(`01° 15' 00" S`)
    expect(DMS.formatLatitude(0.25)).toEqual(`00° 15' 00" N`)
    expect(DMS.formatLatitude(-0.25)).toEqual(`00° 15' 00" S`)
    expect(DMS.formatLatitude(0.0625)).toEqual(`00° 00' 15" N`)
    expect(DMS.formatLatitude(-0.0625)).toEqual(`00° 00' 15" S`)
  });

  it('formats a longitude as dms', () => {
    expect(DMS.formatLongitude(128.077251)).toEqual(`128° 04' 38" E`)
    expect(DMS.formatLongitude(-128.077251)).toEqual(`128° 04' 38" W`)
    expect(DMS.formatLongitude(18.077251)).toEqual(`018° 04' 38" E`)
    expect(DMS.formatLongitude(-18.077251)).toEqual(`018° 04' 38" W`)
    expect(DMS.formatLongitude(8.077251)).toEqual(`008° 04' 38" E`)
    expect(DMS.formatLongitude(-8.077251)).toEqual(`008° 04' 38" W`)
    expect(DMS.formatLongitude(0.077251)).toEqual(`000° 04' 38" E`)
    expect(DMS.formatLongitude(-0.077251)).toEqual(`000° 04' 38" W`)
  });
});