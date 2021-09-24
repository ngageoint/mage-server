
import * as asam from './asam'
import { MsiResponse, MsiRequest } from '../nga-msi'
import { JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import { FeatureCollection } from 'geojson'

describe('asam topic module', function() {

  it('provides a topic descriptor', function() {
    const descriptor = asam.topicDescriptor
    expect(descriptor.id).toEqual('asam')
    expect(descriptor.itemsHaveIdentity).toEqual(true)
    expect(descriptor.itemsHaveSpatialDimension).toEqual(true)
    expect(descriptor.itemTemporalProperty).toEqual('timestamp')
    expect(descriptor.itemPrimaryProperty).toEqual('description')
    expect(descriptor.itemSecondaryProperty).toEqual('hostilityVictim')
  })

  describe('creating requests', function() {

    let RealDate: DateConstructor
    let dateSpy: jest.SpyInstance

    beforeEach(function() {
      RealDate = global.Date
      dateSpy = jest.spyOn(global, 'Date')
    })

    afterEach(function() {
      dateSpy.mockRestore()
    })

    it('creates a request', async function() {

      const dateNow = new RealDate()
      dateNow.setUTCFullYear(2020, 6, 14)
      dateSpy.mockImplementation((time?: number): any => {
        if (typeof time === 'number') {
          return new RealDate(time)
        }
        return dateNow
      })
      const params: asam.AsamTopicParams = {
        newerThanDays: 12
      }
      const req = asam.createContentRequest(params)

      expect(req.method).toEqual('get')
      expect(req.path).toEqual('/api/publications/asam')
      expect(req.body).toBeUndefined()
      expect(req.queryParams).toEqual({
        minOccurDate: '2020-07-02',
        maxOccurDate: '2020-07-14',
        sort: 'date',
        output: 'json'
      })
      expect(dateSpy).toBeCalledWith(dateNow.getTime() - params.newerThanDays! * 24 * 60 * 60 * 1000)
    })

    xit('needs more tests', function() {

    })
  })

  describe('transforming the response', function() {

    const sampleResponse: asam.AsamResponse & JsonObject = {
      "asam": [
        {
          "reference": "2020-229",
          "date": "2020-07-10",
          "latitude": 0.3333333336894384,
          "longitude": -50.96666666626089,
          "position": "0°20'00\"N \n50°57'60\"W",
          "navArea": "V",
          "subreg": "24",
          "hostility": "BOARDING",
          "victim": null,
          "description": "On 10 June at 0030LT, a duty crew member spotted two robbers armed with a knife and pipe on the aft deck of an anchored bulk carrier at Macapa Anchorage at 00:20N - 050:58W. When the alarm was raised, the robbers fled with some ship�??s property. The crew reported the incident to both the port authority and local agent."
        },
        {
          "reference": "2020-223",
          "date": "2020-07-01",
          "latitude": 1.2813333333927517,
          "longitude": 104.31833333358537,
          "position": "1°16'52.8\"N \n104°19'06\"E",
          "navArea": "XI",
          "subreg": "71",
          "hostility": "ROBBERY",
          "victim": null,
          "description": "FOUR ROBBERS ARMED WITH KNIVES BOARDED A REEFER VESSEL. DUTY CREW SPOTTED THE ROBBERS AND RAISED THE ALARM. ALL CREW MUSTERED. SEEING THE CREW ALERTNESS, THE ROBBERS ESCAPED WITH SHIP'S SPARES. INCIDENT REPORTED TO VTIS."
        },
        {
          "reference": "2020-232",
          "date": "2020-06-29",
          "latitude": 12.383333333044902,
          "longitude": 44.900000000268506,
          "position": "12°22'60\"N \n44°54'00\"E",
          "navArea": "IX",
          "subreg": "62",
          "hostility": null,
          "victim": null,
          "description": "On 29 June, a 10-meter-long gray skiff with four persons onboard approached an underway container ship approximately 27 NM southwest of Aden near position 12:23N - 044:54E. The crew identified the skiff at a distance of 4 NM approaching at a speed of up to 20 knots. The skiff approached within 0.1 NM. The captain activated the fire hoses, sounded the ship's whistle, and the crew retreated to the citadel. As the fire hoses were activated, the skiff stopped her approach at an approximate distance of 0.7 NM from the container ship's starboard side. The crew remained within the citadel until the skiff was 5 NM away."
        },
        {
          "reference": "2020-224",
          "date": "2020-06-24",
          "latitude": 5.349999999574038,
          "longitude": 2.6166666663322076,
          "position": "5°20'60\"N \n2°36'60\"E",
          "navArea": "II",
          "subreg": "57",
          "hostility": null,
          "victim": "PANOFI FRONTIER",
          "description": "On 24 June at 1530LT, armed pirates boarded and kidnapped six crew (5 South Korean and 1 Ghanaian) from the  Ghana-flagged purse seiner PANOFI FRONTIER at position 05:21 N - 002:37E, 61 NM south of Cotonou. The pirates fled in an easterly direction toward Nigerian waters."
        },
      ]
    }

    it('transforms the asam response', async function() {

      const res: MsiResponse = {
        status: 200,
        body: sampleResponse
      }
      const req: MsiRequest = {
        method: 'get',
        path: '/whatever',
        queryParams: {}
      }
      const content = asam.transformResponse(res, req)

      expect(content.topic).toEqual(asam.topicDescriptor.id)
      expect(content).not.toHaveProperty('pageCursor')
      expect(content.items).toEqual<FeatureCollection>({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: sampleResponse.asam[0].reference,
            properties: {
              ...sampleResponse.asam[0],
              hostilityVictim: sampleResponse.asam[0].hostility,
              timestamp: Date.parse(sampleResponse.asam[0].date)
            },
            geometry: {
              type: 'Point',
              coordinates: [ sampleResponse.asam[0].longitude, sampleResponse.asam[0].latitude ]
            }
          },
          {
            type: 'Feature',
            id: sampleResponse.asam[1].reference,
            properties: {
              ...sampleResponse.asam[1],
              hostilityVictim: sampleResponse.asam[1].hostility,
              timestamp: Date.parse(sampleResponse.asam[1].date)
            },
            geometry: {
              type: 'Point',
              coordinates: [ sampleResponse.asam[1].longitude, sampleResponse.asam[1].latitude ]
            }
          },
          {
            type: 'Feature',
            id: sampleResponse.asam[2].reference,
            properties: {
              ...sampleResponse.asam[2],
              timestamp: Date.parse(sampleResponse.asam[2].date)
            },
            geometry: {
              type: 'Point',
              coordinates: [ sampleResponse.asam[2].longitude, sampleResponse.asam[2].latitude ]
            }
          },
          {
            type: 'Feature',
            id: sampleResponse.asam[3].reference,
            properties: {
              ...sampleResponse.asam[3],
              hostilityVictim: sampleResponse.asam[3].victim,
              timestamp: Date.parse(sampleResponse.asam[3].date)
            },
            geometry: {
              type: 'Point',
              coordinates: [ sampleResponse.asam[3].longitude, sampleResponse.asam[3].latitude ]
            }
          }
        ]
      })
    })
  })
})