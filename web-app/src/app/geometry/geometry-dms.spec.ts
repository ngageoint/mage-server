import { O } from '@angular/cdk/keycodes'
import { DimensionKey, DMS, DMSCoordinate, DMSParseError, HemisphereLabel, parseCoordinates } from './geometry-dms';

fdescribe('DMS', () => {

  it('should split the coordinate string', () => {
    expect(DMS.splitCoordinates(null)).toEqual([])
    expect(DMS.splitCoordinates(`112233N 0152144W`)).toEqual([ `112233N`, `0152144W` ])
    expect(DMS.splitCoordinates(`N 11 ° 22'33 "- W 15 ° 21'44`)).toEqual([ `N11°22'33"`, `W15°21'44`])
    expect(DMS.splitCoordinates(`11 ° 22'33 "N - 15 ° 21'44" W`)).toEqual([ `11°22'33"N`, `15°21'44"W` ])
    expect(DMS.splitCoordinates(`11° 22'33 N 015° 21'44 W`)).toEqual([ "11°22'33N", "015°21'44W" ])
    expect(DMS.splitCoordinates(`11.4584 15.6827`)).toEqual([ "11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`-11.4584 15.6827`)).toEqual([ "-11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`11.4584 -15.6827`)).toEqual([ "11.4584", "-15.6827" ])
    expect(DMS.splitCoordinates(`11.4584, 15.6827`)).toEqual([ "11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`-11.4584, 15.6827`)).toEqual([ "-11.4584", "15.6827" ])
    expect(DMS.splitCoordinates(`11.4584, -15.6827`)).toEqual([ "11.4584", "-15.6827" ])
    expect(DMS.splitCoordinates(`N 11 ° 22'30 `)).toEqual([ `N11°22'30` ])
    expect(DMS.splitCoordinates(`N 11°22'30 `)).toEqual([ `N11°22'30` ])
    expect(DMS.splitCoordinates(`0° 00'48"E`)).toEqual([ `0°00'48"E` ])
  })

  it('should parse the coordinate string', () => {
    expect(DMS.parse(null, DimensionKey.Latitude)).toBeNaN()
    expect(DMS.parse(null, DimensionKey.Longitude)).toBeNaN()
    expect(DMS.parse(`112230N`, DimensionKey.Latitude)).toEqual(11.375)
    expect(DMS.parse(`12230N`, DimensionKey.Latitude)).toEqual(1.375)
    expect(DMS.parse(`02230N`, DimensionKey.Latitude)).toEqual(0.375)
    expect(DMS.parse(`2230N`, DimensionKey.Latitude)).toEqual(22.5)
    expect(DMS.parse(`215N`, DimensionKey.Latitude)).toEqual(2.25)
    expect(DMS.parse(`21N`, DimensionKey.Latitude)).toEqual(21)
    expect(DMS.parse(`2N`, DimensionKey.Latitude)).toEqual(2)
    expect(DMS.parse(`N 11 ° 22'30.36 `, DimensionKey.Latitude)).toEqual(11.375)
    expect(DMS.parse(`N 11 ° 22'30.remove `, DimensionKey.Latitude)).toEqual(11.375)
    expect(DMS.parse(`11 ° 22'30 "N`, DimensionKey.Latitude)).toEqual(11.375)
    expect(DMS.parse(`11° 22'30 N`, DimensionKey.Latitude)).toEqual(11.375)
    expect(DMS.parse(`11.4584`, DimensionKey.Latitude)).toEqual(11.4584)
    expect(DMS.parse(`-11.4584`, DimensionKey.Latitude)).toEqual(-11.4584)
    expect(DMS.parse(`0151545W`, DimensionKey.Longitude)).toEqual(-15.2625)
    expect(DMS.parse(`W 15 ° 15'45`, DimensionKey.Longitude)).toEqual(-15.2625)
    expect(DMS.parse(`15 ° 15'45" W`, DimensionKey.Longitude)).toEqual(-15.2625)
    expect(DMS.parse(`015° 15'45 W`, DimensionKey.Longitude)).toEqual(-15.2625)
    expect(DMS.parse(`15.6827`, DimensionKey.Longitude)).toEqual(15.6827)
    expect(DMS.parse(`-15.6827`, DimensionKey.Longitude)).toEqual(-15.6827)
    expect(DMS.parse(`0° 30' 00" S`, DimensionKey.Latitude)).toEqual(-0.5)
    expect(DMS.parse(`1° 00' 00" E`, DimensionKey.Longitude)).toEqual(1.0)
    expect(DMS.parse(`1° 00' 00" W`, DimensionKey.Longitude)).toEqual(-1.0)
    expect(DMS.parse(`0° 30' 00" E`, DimensionKey.Longitude)).toEqual(0.5)
    expect(DMS.parse(`0° 30' 00" W`, DimensionKey.Longitude)).toEqual(-0.5)
    expect(DMS.parse(`xyz0lud°xyz3nur0'xyz0 ada 0xyz"xyzWxyz`, DimensionKey.Longitude)).toEqual(-0.5)
  })

  describe('validation', () => {

    describe('valid latitudes', () => {

      [
        `11°22'30"N`,
        `11 ° 22 ' 30 " N`,
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

  fdescribe('new parsing', () => {

    type InputAndResult = [ string, number, number, number ] | [ string, typeof DMSParseError ]

    const assertParseResult = (inputAndResults: (string | number | DMSCoordinate | typeof DMSParseError)[]) => {
      const [ input, ...results ] = inputAndResults
      const parsed = parseCoordinates(String(input))
      if (results[0] === DMSParseError) {
        expect(parsed instanceof DMSParseError).toBe(true, `parsing ${input} should produce an error`)
      }
      else {
        expect(parsed).toEqual(results as any, `failed to parse ${input}`)
      }
    }

    it(`parses focused input`, () => {

      const parsed = parseCoordinates(`12° 34" 56' N`)
      console.log('result', parsed)
      // expect(parsed).toEqual([ new DMSCoordinate(1, 2, 3, 'E') ], String(parsed))
      expect(parsed instanceof DMSParseError).toBe(true)
    })

    it('parses a decimal coordinate', () => {
      [
        [ '1', 1 ],
        [ '12', 12 ],
        [ '123', 123 ],
        [ '1.123', 1.123 ],
        [ '  1  ', 1 ],
        [ '  12  ', 12 ],
        [ '..123  ', DMSParseError ],
        [ '..12.345  ', DMSParseError ],
        [ '12.345.  ', DMSParseError ],
        [ '12.34.45', DMSParseError ],
      ]
      .forEach(assertParseResult)
    })

    it('parses a signed decimal coordinate', () => {
      [
        [ '+1', 1 ],
        [ '-1', -1 ],
        [ '+12', 12 ],
        [ '-12', -12 ],
        [ '+123', 123 ],
        [ '-123', -123 ],
        [ '+1.123', 1.123 ],
        [ '-1.123', -1.123 ],
        [ '  +1  ', 1 ],
        [ '  -1  ', -1 ],
        [ '  +12  ', 12 ],
        [ '  -12  ', -12 ],
        [ '  +123  ', 123 ],
        [ '  -123  ', -123 ],
        [ '  +12.345  ', 12.345 ],
        [ '  -12.345  ', -12.345 ],
        [ '-12-', DMSParseError ],
        [ '+12+', DMSParseError ],
        [ '--12.345', DMSParseError ],
        [ '++12.345', DMSParseError ],
        [ '-+12.345', DMSParseError ],
        [ '+-12.345', DMSParseError ],
        [ '12.345+', DMSParseError ],
        [ '12.345-', DMSParseError ],
        [ '+12.345+', DMSParseError ],
        [ '-12.345-', DMSParseError ],
      ]
      .forEach(assertParseResult)
    })

    describe('multiple decimal coordinates', () => {

      it('parses white-space-delimited coordinates', () => {
        [
          [ '1 2 3', 1, 2, 3 ],
          [ '  1  2  3  ', 1, 2, 3 ],
          [ '1.1 2.2 3.3', 1.1, 2.2, 3.3 ],
          [ '   -1.1 \t 2.2 \n -3.3\r\n', -1.1, 2.2, -3.3 ],
          [ '   +1.1 \t -2.2 \n 3.3\r\n', 1.1, -2.2, 3.3 ],
          [ '   1.1 \t +2.2 \n -3.3\n  ', 1.1, 2.2, -3.3 ],
          [ '   -1.1 \t -2.2 \n -3.3\r\n', -1.1, -2.2, -3.3 ],
          [ '   -1.1 \t -2.2 \n -3..3\r\n', DMSParseError ],
          [ '   -1.1 \t --2.2 \n -3.3\r\n', DMSParseError ],
          [ '   -1.1 \t -2.2 \n + -3.3\r\n', DMSParseError ],
        ]
        .forEach(assertParseResult)
      })

      it('parses dash-delimited coordinates', () => {
        [
          [ '1- 2 - 3', 1, 2, 3 ],
          [ '  1 -  2-  3  ', 1, 2, 3 ],
          [ '1.1 - 2.2 - 3.3', 1.1, 2.2, 3.3 ],
          [ '   -1.1 - 2.2- -3.3\r\n', -1.1, 2.2, -3.3 ],
          [ '   +1.1 - -2.2 - 3.3\r\n', 1.1, -2.2, 3.3 ],
          [ '   1.1 - +2.2- -3.3\n  ', 1.1, 2.2, -3.3 ],
          [ '   -1.1 - -2.2 - -3.3', -1.1, -2.2, -3.3 ],
          [ '   -1.1 - -2.2 - -3..3', DMSParseError ],
          [ '   -1.1 - --2.2 - -3.3', DMSParseError ],
          [ '   -1.1 -2.2-+ -3.3', DMSParseError ],
        ]
        .forEach(assertParseResult)
      })

      it('parses comma-delimeted coordinates', () => {
        [
          [ '1,2,3', 1, 2, 3 ],
          [ '  1 ,2, 3  ', 1, 2, 3 ],
          [ '1.1,2.2,3.3', 1.1, 2.2, 3.3 ],
          [ '   -1.1, 2.2, -3.3', -1.1, 2.2, -3.3 ],
          [ '   +1.1 , -2.2, 3.3', 1.1, -2.2, 3.3 ],
          [ '   1.1, +2.2 ,-3.3\n  ', 1.1, 2.2, -3.3 ],
          [ '   -1.1 , -2.2  , -3.3\r\n', -1.1, -2.2, -3.3 ],
          [ '   -1.1 ,-2.2, -3..3', DMSParseError ],
          [ '   -1.1 , --2.2 , -3.3', DMSParseError ],
          [ '   -1.1, -2.2 , + -3.3', DMSParseError ],
        ]
        .forEach(assertParseResult)
      })
    })

    describe('dms format', () => {

      const assertForEachHemisphere = (expectation: InputAndResult, hemispheres: string = 'NSEW') => {
        const [ baseInput, deg, min, sec ] = expectation
        for (const hemi of hemispheres) {
          const hemiPrefixInput = `${hemi}${baseInput}`
          const hemiSuffixInput = `${baseInput}${hemi}`
          const hemiPrefixParsed = parseCoordinates(hemiPrefixInput)
          const hemiSuffixParsed = parseCoordinates(hemiSuffixInput)
          if (typeof deg === 'number') {
            const coord = [ new DMSCoordinate(deg, min, sec, hemi as HemisphereLabel) ]
            expect(hemiPrefixParsed).toEqual(coord, hemiPrefixInput)
            expect(hemiSuffixParsed).toEqual(coord, hemiSuffixInput)
          }
          else {
            expect(hemiPrefixParsed instanceof DMSParseError).toBe(true)
            expect(hemiSuffixParsed instanceof DMSParseError).toBe(true)
          }
        }
      }
      const assertForLatHemispheres = (expectation: InputAndResult) => assertForEachHemisphere(expectation, 'NS')
      const assertForLonHemispheres = (expectation: InputAndResult) => assertForEachHemisphere(expectation, 'EW')

      describe('with all labeled parts', () => {

        it('parses input with no spaces', () => {

          [
            [ `0°0'0"`, 0, 0, 0 ],
            [ `0°0'1"`, 0, 0, 1 ],
            [ `00°00'00"`, 0, 0, 0 ],
            [ `12°0'0"`, 12, 0, 0 ],
            [ `1°2'34"`, 1, 2, 34 ],
            [ `1°23'45"`, 1, 23, 45 ],
            [ `12°34'56"`, 12, 34, 56 ],
            [ `01°02'03"`, 1, 2, 3 ],
          ]
          .forEach(x => assertForEachHemisphere(x as InputAndResult))
        })

        it('parses input with spaces around units and digits', () => {

          [
            [ ` 0  °  0  '  0  "`, 0, 0, 0 ],
            [ `  0°  0  ' 1  " `, 0, 0, 1 ],
            [ `  00 °  00 '  00 "`, 0, 0, 0 ],
            [ ` 12 ° 0 ' 0 " `, 12, 0, 0 ],
            [ ` 1 ° 2 ' 34 " `, 1, 2, 34 ],
            [ `1  °  23'45"`, 1, 23, 45 ],
            [ `12 °  34 '56  "`, 12, 34, 56 ],
            [ `01  °02  '03"`, 1, 2, 3 ],
          ]
          .forEach(x => assertForEachHemisphere(x as InputAndResult))
        })
      })

      describe('with partial labeled parts', () => {

        it('parses one part', () => {

          [
            [ `0°`, 0, 0, 0 ],
            [ `8°`, 8, 0, 0 ],
            [ `08°`, 8, 0, 0 ],
            [ `12°`, 12, 0, 0 ],
            [ `0'`, 0, 0, 0 ],
            [ `8'`, 0, 8, 0 ],
            [ `08'`, 0, 8, 0 ],
            [ `12'`, 0, 12, 0 ],
            [ `0"`, 0, 0, 0 ],
            [ `8"`, 0, 0, 8 ],
            [ `08"`, 0, 0, 8 ],
            [ `12"`, 0, 0, 12 ],
          ]
          .forEach(x => assertForEachHemisphere(x as InputAndResult))
        })

        it('parses two parts', () => {

          [
            [ `0°0'`, 0, 0, 0 ],
            [ `0'1"`, 0, 0, 1 ],
            [ `00° 0'`, 0, 0, 0 ],
            [ `12° 12"`, 12, 0, 12 ],
            [ `02 ' 34 "`, 0, 2, 34 ],
            [ `01° 00"`, 1, 0, 0 ],
          ]
          .forEach(x => assertForEachHemisphere(x as InputAndResult))
        })
      })

      describe('compact without labels', () => {

        it('parses fully specified digits', () => {

          [
            [ '0000000', 0, 0, 0 ],
            [ '0123456', 12, 34, 56 ],
            [ '0010203', 1, 2, 3 ],
            [ '1795959', 179, 59, 59 ],
            [ '1000000', 100, 0, 0 ],
          ]
          .forEach(x => assertForLonHemispheres(x as InputAndResult));

          [
            [ '000000', 0, 0, 0 ],
            [ '123456', 12, 34, 56 ],
            [ '010203', 1, 2, 3 ],
            [ '795959', 79, 59, 59 ],
          ]
          .forEach(x => assertForLatHemispheres(x as InputAndResult))
        })

        it('fills partial digits starting from seconds', () => {
          [
            [ '00001', 0, 0, 1 ],
            [ '12345', 1, 23, 45 ],
            [ '32100', 3, 21, 0 ],
          ]
          .forEach(x => assertForEachHemisphere(x as InputAndResult))
        })
      })

      it('does not parse labeled parts out of order', () => {

        const baseCoordinates = [
          [ `0" 0' 0° W`, DMSParseError ],
          [ `  0" 1° S`, DMSParseError ],
          [ `12' 34° 56" E`, DMSParseError ],
          [ `12° 34" 56' N`, DMSParseError ],
          [ `15" 15° N`, DMSParseError ],
          [ `15" 15' S`, DMSParseError ],
          [ `15E°`, DMSParseError ],
        ]
        baseCoordinates.forEach(assertParseResult)
      })

      it('does not parse parts with repeated units', () => {
        [
          [ `15"15"E`, DMSParseError ],
          [ `15°2°E`, DMSParseError ],
          [ `15°°E`, DMSParseError ],
        ]
        .forEach(assertParseResult)
      })

      it('does not parse dms with multiple hemispheres', () => {
        [
          [ `N N 14°`, DMSParseError ],
          [ `N 14° S`, DMSParseError ],
          [ `14° S E`, DMSParseError ],
        ]
        .forEach(assertParseResult)
      })

      it('does not parse dms with signs', () => {
        [
          [ `-1°W`, DMSParseError ],
          [ `E -1°`, DMSParseError ],
          [ `+12° N`, DMSParseError ],
          [ `+01" S`, DMSParseError ]
        ]
        .forEach(assertParseResult)
      })

      it('does not parse unlabeled with less than five digits', () => {
        [
          [ '0', DMSParseError ],
          [ '00', DMSParseError ],
          [ '000', DMSParseError ],
          [ '0000', DMSParseError ],
          [ '1234', DMSParseError ],
          [ '123', DMSParseError ],
          [ '12', DMSParseError ],
          [ '1', DMSParseError ],
        ]
        .forEach(x => assertForEachHemisphere(x as InputAndResult))
      })

      describe('bounds errors', () => {

        it('yields an error for latitudes > 90', () => {
          [
            [ `90°00'01"`, DMSParseError ],
            [ `90°01'00"`, DMSParseError ],
            [ `91°00'00"`, DMSParseError ],
            [ `910000`, DMSParseError ],
            [ `900001`, DMSParseError ],
          ]
          .forEach(x => assertForLatHemispheres(x as InputAndResult))
        })

        it('yields an error for longitudes > 180', () => {
          [
            [ `180°00'01"`, DMSParseError ],
            [ `180°01'00"`, DMSParseError ],
            [ `180°0'1"`, DMSParseError ],
            [ `181°0'0"`, DMSParseError ],
            [ `1800001`, DMSParseError ],
          ]
          .forEach(x => assertForLonHemispheres(x as InputAndResult))
        })
      })

      describe('multiple coordinates', () => {

        it('parses multiple white-space-delimited labeled dms', () => {

          const parsed = parseCoordinates(`
            1°2'3"N
            179 °E
            10' 59 " N
            001° 38' W
            S 12° 34 '  56"
            W 13 ° 57 ' 19"
          `)
          expect(parsed).toEqual([
            new DMSCoordinate(1, 2, 3, 'N'),
            new DMSCoordinate(179, 0, 0, 'E'),
            new DMSCoordinate(0, 10, 59, 'N'),
            new DMSCoordinate(1, 38, 0, 'W'),
            new DMSCoordinate(12, 34, 56, 'S'),
            new DMSCoordinate(13, 57, 19, 'W'),
          ])
        })

        it('parses multiple white-space-delimited unlabeled dms', () => {

          const parsed = parseCoordinates(`
            10203 N
            1790000E
            001059N
            0013800 W
            S 123456
            W 135719
          `)
          expect(parsed).toEqual([
            new DMSCoordinate(1, 2, 3, 'N'),
            new DMSCoordinate(179, 0, 0, 'E'),
            new DMSCoordinate(0, 10, 59, 'N'),
            new DMSCoordinate(1, 38, 0, 'W'),
            new DMSCoordinate(12, 34, 56, 'S'),
            new DMSCoordinate(13, 57, 19, 'W'),
          ])
        })

        it('parses dash-delimited labeled coordinates', () => {

          const parsed = parseCoordinates(
            [
              `1°2'3"N`,
              `179 °E`,
              `10' 59 " N`,
              `001° 38' W`,
              `S 12° 34 '  56"`,
              `W 13 ° 57 ' 19"`,
            ]
            .join(' - ')
          )
          expect(parsed).toEqual([
            new DMSCoordinate(1, 2, 3, 'N'),
            new DMSCoordinate(179, 0, 0, 'E'),
            new DMSCoordinate(0, 10, 59, 'N'),
            new DMSCoordinate(1, 38, 0, 'W'),
            new DMSCoordinate(12, 34, 56, 'S'),
            new DMSCoordinate(13, 57, 19, 'W'),
          ])
        })

        it('parses dash-delimited unlabeled coordinates', () => {

          const parsed = parseCoordinates(
            [
              `10203N`,
              `1790000E`,
              ` 01059 N`,
              `0013800 W `,
              `S 123456 `,
              ` W 135719`,
            ]
            .join(' - ')
          )
          expect(parsed).toEqual([
            new DMSCoordinate(1, 2, 3, 'N'),
            new DMSCoordinate(179, 0, 0, 'E'),
            new DMSCoordinate(0, 10, 59, 'N'),
            new DMSCoordinate(1, 38, 0, 'W'),
            new DMSCoordinate(12, 34, 56, 'S'),
            new DMSCoordinate(13, 57, 19, 'W'),
          ])
        })

        it('parses comma-delimited labeled coordinates', () => {

          const parsed = parseCoordinates(
            [
              `1°2'3"N`,
              `179 °E`,
              `10' 59 " N`,
              `001° 38' W`,
              `S 12° 34 '  56"`,
              `W 13 ° 57 ' 19"`,
            ]
            .join(',')
          )
          expect(parsed).toEqual([
            new DMSCoordinate(1, 2, 3, 'N'),
            new DMSCoordinate(179, 0, 0, 'E'),
            new DMSCoordinate(0, 10, 59, 'N'),
            new DMSCoordinate(1, 38, 0, 'W'),
            new DMSCoordinate(12, 34, 56, 'S'),
            new DMSCoordinate(13, 57, 19, 'W'),
          ])
        })

        it('parses comma-delimited unlabeled coordinates', () => {

          const parsed = parseCoordinates(
            [
              `10203N`,
              `1790000E`,
              ` 01059 N`,
              `0013800 W `,
              `S 123456 `,
              ` W 135719`,
            ]
            .join(',')
          )
          expect(parsed).toEqual([
            new DMSCoordinate(1, 2, 3, 'N'),
            new DMSCoordinate(179, 0, 0, 'E'),
            new DMSCoordinate(0, 10, 59, 'N'),
            new DMSCoordinate(1, 38, 0, 'W'),
            new DMSCoordinate(12, 34, 56, 'S'),
            new DMSCoordinate(13, 57, 19, 'W'),
          ])
        })
      })
    })

  })
})