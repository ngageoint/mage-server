import { DimensionKey, DMSCoordinate, DMSParseError, generateParsedCoordinates, HemisphereLabel, parseCoordinates } from './geometry-dms';
import * as DMS from './geometry-dms'

describe('DMS', () => {

  it('should parse the coordinate string', () => {
    expect(DMS.parseOne(null, DimensionKey.Latitude)).toBeNaN()
    expect(DMS.parseOne(null, DimensionKey.Longitude)).toBeNaN()
    expect(DMS.parseOne(`112230N`, DimensionKey.Latitude)).toEqual(11.375)
    expect(DMS.parseOne(`12454N`, DimensionKey.Latitude)).toEqual(1 + 24 / 60 + 54 / 3600)
    expect(DMS.parseOne(`02230N`, DimensionKey.Latitude)).toEqual(0.375)
    expect(DMS.parseOne(`2230N`, DimensionKey.Latitude)).toEqual(22 / 60 + 30 / 3600)
    expect(DMS.parseOne(`215N`, DimensionKey.Latitude)).toEqual(2 / 60 + 15 / 3600)
    expect(DMS.parseOne(`21N`, DimensionKey.Latitude)).toEqual(21 / 3600)
    expect(DMS.parseOne(`2N`, DimensionKey.Latitude)).toEqual(2 / 3600)
    expect(DMS.parseOne(`N 11 ° 24'36.36 `, DimensionKey.Latitude)).toEqual(11.4101)
    expect(DMS.parseOne(`N 11 ° 22'30.wut `, DimensionKey.Latitude)).toBeNaN()
    expect(DMS.parseOne(`11 ° 22'30 "N`, DimensionKey.Latitude)).toEqual(11.375)
    expect(DMS.parseOne(`11° 22'30 N`, DimensionKey.Latitude)).toEqual(11.375)
    expect(DMS.parseOne(`11.4584`, DimensionKey.Latitude)).toEqual(11.4584)
    expect(DMS.parseOne(`-11.4584`, DimensionKey.Latitude)).toEqual(-11.4584)
    expect(DMS.parseOne(`- 1 1 . 4 5 8 4`, DimensionKey.Latitude)).toBeNaN()
    expect(DMS.parseOne(`0151545W`, DimensionKey.Longitude)).toEqual(-15.2625)
    expect(DMS.parseOne(`W 15 ° 15'45`, DimensionKey.Longitude)).toEqual(-15.2625)
    expect(DMS.parseOne(`15 ° 15'45" W`, DimensionKey.Longitude)).toEqual(-15.2625)
    expect(DMS.parseOne(`015° 15'45 W`, DimensionKey.Longitude)).toEqual(-15.2625)
    expect(DMS.parseOne(`15.6827`, DimensionKey.Longitude)).toEqual(15.6827)
    expect(DMS.parseOne(`-15.6827`, DimensionKey.Longitude)).toEqual(-15.6827)
    expect(DMS.parseOne(`0° 30' 00" S`, DimensionKey.Latitude)).toEqual(-0.5)
    expect(DMS.parseOne(`1° 00' 00" E`, DimensionKey.Longitude)).toEqual(1.0)
    expect(DMS.parseOne(`1° 00' 00" W`, DimensionKey.Longitude)).toEqual(-1.0)
    expect(DMS.parseOne(`0° 30' 00" E`, DimensionKey.Longitude)).toEqual(0.5)
    expect(DMS.parseOne(`0° 30' 00" W`, DimensionKey.Longitude)).toEqual(-0.5)
    expect(DMS.parseOne(`xyz0lud°xyz3nur0'xyz0 ada 0xyz"xyzWxyz`, DimensionKey.Longitude)).toBeNaN()
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
        `2N`,
        `33N`,
        `233N`,
        `2233N`,
      ]
      .forEach(input => {
        it(`validates latitude ${input}`, () => {
          expect(DMS.validateLatitude(input)).toBeTruthy()
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
          expect(DMS.validateLatitude(input)).toBeFalsy()
        })
      })
    })

    describe('valid longitudes', () => {
      [
        `104° 40' 05" E`,
        `1800000E`,
        `1800000W`,
        `002233E`,
        `2W`,
        `33W`,
        `233W`,
        `2233W`,
      ]
      .forEach(input => {
        it(`validates longitude ${input}`, () => {
          expect(DMS.validateLongitude(input)).toBeTruthy()
        })
      })
    })

    describe('invalid longitudes', () => {
      [
        null,
        ``,
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
          expect(DMS.validateLongitude(input)).toBeFalsy()
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

  describe('parsing', () => {

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

    describe('decimals', () => {

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

        it('accepts fractional seconds', () => {
          [
            [ `0°0'0.125"`, 0, 0, 0.125 ],
            [ `0°0'1.125"`, 0, 0, 1.125 ],
            [ `12°0'0.777"`, 12, 0, 0.777 ],
            [ `1°2'34.8"`, 1, 2, 34.8 ],
            [ `12°34'56.005"`, 12, 34, 56.005 ],
          ]
          .forEach(x => assertForEachHemisphere(x as InputAndResult))
        })

        it('accepts unlabeled seconds', () => {
          [
            [ `0°0'0.125`, 0, 0, 0.125 ],
            [ `0°0'1.125`, 0, 0, 1.125 ],
            [ `12°0'0.777`, 12, 0, 0.777 ],
            [ `1°2'34.8`, 1, 2, 34.8 ],
            [ `12°34'56.005`, 12, 34, 56.005 ],
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

        it('accepts fractional seconds', () => {
          [
            [ `1'0.125"`, 0, 1, 0.125 ],
            [ `0°1.125"`, 0, 0, 1.125 ],
            [ `0.777"`, 0, 0, 0.777 ],
            [ `11°34.8"`, 11, 0, 34.8 ],
            [ `56.005"`, 0, 0, 56.005 ],
          ]
          .forEach(x => assertForEachHemisphere(x as InputAndResult))
        })

        it('accepts unlabeled seconds', () => {
          [
            [ `1'0.125`, 0, 1, 0.125 ],
            [ `0°1.125`, 0, 0, 1.125 ],
            [ `0.777`, 0, 0, 0.777 ],
            [ `11°34.8`, 11, 0, 34.8 ],
            [ `56.005`, 0, 0, 56.005 ],
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
            [ '0', 0, 0, 0 ],
            [ '10', 0, 0, 10 ],
            [ '100', 0, 1, 0 ],
            [ '1000', 0, 10, 0 ],
            [ '1234', 0, 12, 34 ],
            [ '123', 0, 1, 23 ],
            [ '12', 0, 0, 12 ],
            [ '1', 0, 0, 1 ],
          ]
          .forEach(x => assertForEachHemisphere(x as InputAndResult))
        })

        it('accepts fractional seconds', () => {

          [
            [ '0000000.123', 0, 0, 0.123 ],
            [ '0123456.007', 12, 34, 56.007 ],
            [ '0010203.321', 1, 2, 3.321 ],
            [ '1795959.99', 179, 59, 59.99 ],
            [ '1000000.000', 100, 0, 0 ],
          ]
          .forEach(x => assertForLonHemispheres(x as InputAndResult));

          [
            [ '000000.25', 0, 0, 0.25 ],
            [ '123456.005', 12, 34, 56.005 ],
            [ '010203.0', 1, 2, 3 ],
            [ '795959.999', 79, 59, 59.999 ],
          ]
          .forEach(x => assertForLatHemispheres(x as InputAndResult))
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

        it('yields an error for minutes > 59', () => {
          [
            [ `0°60'0"`, DMSParseError ],
            [ `0°59'0"`, 0, 59, 0 ],
            [ `1°60'59"`, DMSParseError ],
            [ `1°59'59"`, 1, 59, 59 ],
            [ `59°590'0"`, DMSParseError ],
            [ `59°59'0"`, 59, 59, 0 ],
            [ `06000`, DMSParseError ],
            [ `05900`, 0, 59, 0 ],
            [ `596000`, DMSParseError ],
            [ `595900`, 59, 59, 0 ],
            [ `596000`, DMSParseError ],
            [ `595900`, 59, 59, 0 ],
          ]
          .forEach(x => assertForEachHemisphere(x as InputAndResult));

          [
            [ `111°60'1"`, DMSParseError ],
            [ `111°59'1"`, 111, 59, 1 ],
            [ `111°160'01"`, DMSParseError ],
            [ `011°16'01"`, 11, 16, 1  ],
          ]
          .forEach(x => assertForLonHemispheres(x as InputAndResult))
        })

        it('yields an error for seconds > 59', () => {
          [
            [ `0°0'60"`, DMSParseError ],
            [ `0°0'59"`, 0, 0, 59 ],
            [ `1°59'60"`, DMSParseError ],
            [ `1°59'59"`, 1, 59, 59 ],
            [ `59°59'590"`, DMSParseError ],
            [ `59°59'59"`, 59, 59, 59 ],
            [ `00060`, DMSParseError ],
            [ `00059`, 0, 0, 59 ],
            [ `595960`, DMSParseError ],
            [ `595959`, 59, 59, 59 ],
          ]
          .forEach(x => assertForEachHemisphere(x as InputAndResult))
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

    describe('multiple mixed coordinates', () => {

      it('parses decimals and dms with mixed delimiting', () => {

        const baseInput = [
          `179°00'00"E`,
          `32`,
          `-102.8292`,
          `10203N`,
          `+37.75`,
          `01059 N`,
          `13°8'00" W`,
          `S 123456`,
          `W 135719`,
          -102.0,
        ]
        const baseExpected = [
          new DMSCoordinate(179, 0, 0, 'E'),
          32,
          -102.8292,
          new DMSCoordinate(1, 2, 3, 'N'),
          37.75,
          new DMSCoordinate(0, 10, 59, 'N'),
          new DMSCoordinate(13, 8, 0, 'W'),
          new DMSCoordinate(12, 34, 56, 'S'),
          new DMSCoordinate(13, 57, 19, 'W'),
          -102,
        ]
        const spaceDelimited = baseInput.join(' ')
        const commaDelimited = baseInput.join(',')
        const dashDelimited = baseInput.join(' - ')
        const allInput = `${spaceDelimited} - ${commaDelimited} ${dashDelimited}`
        const parsed = parseCoordinates(allInput)
        expect(parsed).toEqual([ ...baseExpected, ...baseExpected, ...baseExpected ])
      })
    })

    describe('generator api', () => {

      it('iterates parts coordinates', () => {

        const baseInput = [
          `179°00'00"E`,
          `32`,
          `-102.8292`,
          `10203N`,
          `+37.75`,
          `01059 N`,
          `13°8'00" W`,
          `S 123456`,
          `W 135719`,
          -102.0,
        ]
        const baseExpected = [
          new DMSCoordinate(179, 0, 0, 'E'),
          32,
          -102.8292,
          new DMSCoordinate(1, 2, 3, 'N'),
          37.75,
          new DMSCoordinate(0, 10, 59, 'N'),
          new DMSCoordinate(13, 8, 0, 'W'),
          new DMSCoordinate(12, 34, 56, 'S'),
          new DMSCoordinate(13, 57, 19, 'W'),
          -102,
        ]
        const spaceDelimited = baseInput.join(' ')
        const commaDelimited = baseInput.join(',')
        const dashDelimited = baseInput.join(' - ')
        const allInput = `${spaceDelimited} - ${commaDelimited} ${dashDelimited}`
        const parsed = []
        const parsing = generateParsedCoordinates(allInput)
        for (const coord of parsing) {
          parsed.push(coord)
        }

        expect(parsed).toEqual([ ...baseExpected, ...baseExpected, ...baseExpected ])
      })
    })
  })
})