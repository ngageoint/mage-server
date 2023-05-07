import { DMS } from './geometry-dms';

fdescribe('DMS', () => {

  it('should split the coordinate string', () => {
    expect(DMS.splitCoordinates(null)).toEqual([])
    expect(DMS.splitCoordinates(`112233N 0152144W`)).toEqual([ `112233N`, `0152144W` ])
    expect(DMS.splitCoordinates(`N 11 ° 22'33 "- W 15 ° 21'44`)).toEqual([ `N11°22'33"`, `W15°21'44`])
    expect(DMS.splitCoordinates(`N 11 ° 22'30 `)).toEqual([ `N11°22'30` ])
    expect(DMS.splitCoordinates(`11 ° 22'33 "N - 15 ° 21'44" W`)).toEqual([ `11°22'33"N`, `15°21'44"W` ])
    expect(DMS.splitCoordinates(`11° 22'33 N 015° 21'44 W`)).toEqual([ "11°22'33N", "015°21'44W" ])
    expect(DMS.splitCoordinates(`11.4584 15.6827`)).toEqual([ "11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`-11.4584 15.6827`)).toEqual([ "-11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`11.4584 -15.6827`)).toEqual([ "11.4584", "-15.6827" ])
    expect(DMS.splitCoordinates(`11.4584, 15.6827`)).toEqual([ "11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`-11.4584, 15.6827`)).toEqual([ "-11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`11.4584, -15.6827`)).toEqual([ "11.4584", "-15.6827" ])
  })

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
  })

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
        `002233E`,
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

  it('formats latitude decimal degrees as dms', () => {
    expect(DMS.formatLatitude(11.1)).toEqual(`11° 06' 00" N`)
    expect(DMS.formatLatitude(-11.1)).toEqual(`11° 06' 00" S`)
    expect(DMS.formatLatitude(1.25)).toEqual(`01° 15' 00" N`)
    expect(DMS.formatLatitude(-1.25)).toEqual(`01° 15' 00" S`)
    expect(DMS.formatLatitude(0.25)).toEqual(`00° 15' 00" N`)
    expect(DMS.formatLatitude(-0.25)).toEqual(`00° 15' 00" S`)
    expect(DMS.formatLatitude(0.0125)).toEqual(`00° 00' 45" N`)
    expect(DMS.formatLatitude(-0.0125)).toEqual(`00° 00' 45" S`)
  })

  it('formats longitude decimal degrees as dms', () => {
    expect(DMS.formatLongitude(128.077251)).toEqual(`128° 04' 38" E`)
    expect(DMS.formatLongitude(-128.077251)).toEqual(`128° 04' 38" W`)
    expect(DMS.formatLongitude(18.077251)).toEqual(`018° 04' 38" E`)
    expect(DMS.formatLongitude(-18.077251)).toEqual(`018° 04' 38" W`)
    expect(DMS.formatLongitude(8.077251)).toEqual(`008° 04' 38" E`)
    expect(DMS.formatLongitude(-8.077251)).toEqual(`008° 04' 38" W`)
    expect(DMS.formatLongitude(0.077251)).toEqual(`000° 04' 38" E`)
    expect(DMS.formatLongitude(-0.077251)).toEqual(`000° 04' 38" W`)
  })
})