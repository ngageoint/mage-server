import { GeocoderService } from './geocoder'
import * as DMS from '../geometry/geometry-dms'
import { TestBed, getTestBed, waitForAsync } from '@angular/core/testing';
import { PlacenameSearchService } from './search/search.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Geocoder', () => {

    let geocoder: GeocoderService
    let coordinates = ""
    let parsed = null

    let injector: TestBed;
    let service: PlacenameSearchService;

      beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
          imports: [HttpClientTestingModule ],
          declarations: [ ],
          providers: []
        })
        .compileComponents();
      }));

    beforeEach(() => {
        injector = getTestBed();
        service = injector.inject(PlacenameSearchService);

        geocoder = injector.inject(GeocoderService)
    })

    it('should parse a decimal location without searching', () => {
        spyOn(service, 'search')

        const parsed = geocoder.coordinateFromText('39.75, -104.98')

        expect(parsed?.position[1]).toBeCloseTo(39.75)
        expect(parsed?.position[0]).toBeCloseTo(-104.98)
        expect(service.search).not.toHaveBeenCalled()
    })

    it('should parse an MGRS location', () => {
        const parsed = geocoder.coordinateFromText('13SEE0171300010')

        expect(parsed?.position[1]).toBeCloseTo(39.75, 4)
        expect(parsed?.position[0]).toBeCloseTo(-104.98, 4)
    })

    it('should apply hemisphere letters to decimal coordinates', () => {
        expect(geocoder.coordinateFromText('39.75N, 104.98W')?.position).toEqual([-104.98, 39.75])
        expect(geocoder.coordinateFromText('40.5S 77.2W')?.position).toEqual([-77.2, -40.5])
        expect(geocoder.coordinateFromText('40.5S, 77.2E')?.position).toEqual([77.2, -40.5])
    })

    it('should apply a leading minus to DMS coordinates', () => {
        expect(geocoder.coordinateFromText(`-40°30'00", -77°30'00"`)?.position).toEqual([-77.5, -40.5])
        expect(geocoder.coordinateFromText(`40°30'00", -77°30'00"`)?.position).toEqual([-77.5, 40.5])
    })

    it('should report the coordinate system of a parsed location', () => {
        expect(geocoder.coordinateFromText('39.75, -104.98')?.coordinateSystem).toEqual('wgs84')
        expect(geocoder.coordinateFromText('39.75N 104.98W')?.coordinateSystem).toEqual('wgs84')
        expect(geocoder.coordinateFromText('13SEE0171300010')?.coordinateSystem).toEqual('mgrs')
        expect(geocoder.coordinateFromText('510LV37')?.coordinateSystem).toEqual('gars')
        expect(geocoder.coordinateFromText(`39° 45' 00" N, 104° 58' 48" W`)?.coordinateSystem).toEqual('dms')
        expect(geocoder.coordinateFromText('0955N, 05910W')?.coordinateSystem).toEqual('dms')
    })

    it('should parse a GARS cell to its center', () => {
        const thirtyMinute = geocoder.coordinateFromText('510LV')
        expect(thirtyMinute?.position[1]).toBeCloseTo(39.75)
        expect(thirtyMinute?.position[0]).toBeCloseTo(74.75)

        const fiveMinute = geocoder.coordinateFromText('510 lv 37')
        expect(fiveMinute?.position[1]).toBeCloseTo(39.5 + 5 / 120)
        expect(fiveMinute?.position[0]).toBeCloseTo(74.5 + 5 / 120)
    })

    it('should parse a location in the DMS display format', () => {
        const parsed = geocoder.coordinateFromText(`${DMS.formatLatitude(39.75)}, ${DMS.formatLongitude(-104.98)}`)

        expect(parsed?.position[1]).toBeCloseTo(39.75, 4)
        expect(parsed?.position[0]).toBeCloseTo(-104.98, 4)
    })

    it('should not parse a place name as a location', () => {
        spyOn(service, 'search')

        expect(geocoder.coordinateFromText('denver')).toBeNull()
        expect(service.search).not.toHaveBeenCalled()
    })

    it('should parse string with dashes', async () => {
        coordinates = "11-07-28N/074-07-29W"
        parsed = (await geocoder.geocode(coordinates))[0]
        expect(parsed?.latitude).toBeCloseTo(11.12444)
        expect(parsed?.longitude).toBeCloseTo(-74.124722)

        // future test
        coordinates = "11-22-30N 015-15-45W"
        parsed = (await geocoder.geocode(coordinates))[0]
        expect(parsed?.latitude).toBeCloseTo(11.375)
        expect(parsed?.longitude).toBeCloseTo(-15.2625)
    })

    it('should parse coord with DMS and Direction', async () => {
        coordinates = "N  08° 03' 32.99\"   W  084° 26' 14.98\""
        parsed = (await geocoder.geocode(coordinates))[0]
        expect(parsed?.latitude).toBeCloseTo(8.059166)
        expect(parsed?.longitude).toBeCloseTo(-84.4375)
    })

    it('should parse coord with no separators', async () => {
        coordinates = "0955N, 05910W"
        parsed = (await geocoder.geocode(coordinates))[0]
        expect(parsed?.latitude).toBeCloseTo(0.165277)
        expect(parsed?.longitude).toBeCloseTo(-0.9861111)
    })

    it('should parse coord with only minute separator', async () => {
        coordinates = "12 21’50 N 70 12’14 W"
        parsed = (await geocoder.geocode(coordinates))[0]
        expect(parsed?.latitude).toBeCloseTo(12.36388)
        expect(parsed?.longitude).toBeCloseTo(-70.20388)
    })

    it('should parse one coordinate with direction geocode returns empty', async () => {
        coordinates = "11 ° 22'30 \"N"
        parsed = geocoder.parse(coordinates)
        expect(Number.isNaN(parsed?.[0])).toBe(true)
        expect(parsed?.[1]).toBe(11.375)

        let geocoded = await geocoder.geocode(coordinates)
        expect(geocoded).toHaveSize(0)
    })
    it('should parse one coordinate geocode returns empty', async () => {
        coordinates = "11.4584"
        parsed = geocoder.parse(coordinates)
        expect(Number.isNaN(parsed?.[0])).toBe(true)
        expect(parsed?.[1]).toBe(11.4584)

        let geocoded = await geocoder.geocode(coordinates)
        expect(geocoded).toHaveSize(0)
    })

  it('should parse the coordinate string', async () => {
    coordinates = "112230N 404030W"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(11.375)
    expect(parsed?.longitude).toBe(-40.675)

    coordinates = "112230N 0151545W"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(11.375)
    expect(parsed?.longitude).toBe(-15.2625)

    coordinates = "N 11 ° 22'30 \"- W 15 ° 15'45"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(11.375)
    expect(parsed?.longitude).toBe(-15.2625)

    coordinates = "11 ° 22'30 \"N - 15 ° 15'45\" W"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(11.375)
    expect(parsed?.longitude).toBe(-15.2625)

    coordinates = "11° 22'30 N 015° 15'45 W"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(11.375)
    expect(parsed?.longitude).toBe(-15.2625)

    coordinates = "N 11° 22'30 W 015° 15'45 "
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(11.375)
    expect(parsed?.longitude).toBe(-15.2625)

    coordinates = "11.4584 15.6827"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(11.4584)
    expect(parsed?.longitude).toBe(15.6827)

    coordinates = "-11.4584 15.6827"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(-11.4584)
    expect(parsed?.longitude).toBe(15.6827)

    coordinates = "11.4584 -15.6827"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(11.4584)
    expect(parsed?.longitude).toBe(-15.6827)

    coordinates = "11.4584, 15.6827"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(11.4584)
    expect(parsed?.longitude).toBe(15.6827)

    coordinates = "-11.4584, 15.6827"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(-11.4584)
    expect(parsed?.longitude).toBe(15.6827)

    coordinates = "11.4584, -15.6827"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(11.4584)
    expect(parsed?.longitude).toBe(-15.6827)

    coordinates = "LAT 34.35/LONG -12.95"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(34.35)
    expect(parsed?.longitude).toBe(-12.95)

    coordinates = "Lat: 8.59 / Lon: -59.19"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBe(8.59)
    expect(parsed?.longitude).toBe(-59.19)

    coordinates = "08°24'02\"N059°03'26\"W"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBeCloseTo(8.400556)
    expect(parsed?.longitude).toBeCloseTo(-59.057222)

    coordinates = "Lat. 14° 19' 06.00\" N – Long. 82° 40' 06.00\" W"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBeCloseTo(14.318333)
    expect(parsed?.longitude).toBeCloseTo(-82.66833)

    coordinates = "12°17’22.0” - W 071°13’32.2"
    parsed = (await geocoder.geocode(coordinates))[0]
    expect(parsed?.latitude).toBeCloseTo(12.289444)
    expect(parsed?.longitude).toBeCloseTo(-71.225555)
  })
})