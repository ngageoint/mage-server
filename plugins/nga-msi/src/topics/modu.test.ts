
import * as modu from './modu'
import { MsiResponse, MsiRequest } from '../nga-msi'
import { JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import { FeatureCollection } from 'geojson'

describe('modu topic module', function() {

  it('provides a topic descriptor', function() {
    const descriptor = modu.topicDescriptor
    expect(descriptor.id).toEqual('modu')
    expect(descriptor.itemsHaveIdentity).toEqual(true)
    expect(descriptor.itemsHaveSpatialDimension).toEqual(true)
    expect(descriptor.itemTemporalProperty).toEqual('timestamp')
    expect(descriptor.itemPrimaryProperty).toEqual('name')
    expect(descriptor.itemSecondaryProperty).toEqual('rigStatus')
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
      const params: modu.ModuTopicParams = {
        newerThanDays: 12,
        status: 'Active'
      }
      const req = modu.createContentRequest(params)

      expect(req.method).toEqual('get')
      expect(req.path).toEqual('/api/publications/modu')
      expect(req.body).toBeUndefined()
      expect(req.queryParams?.status).toEqual('Active')
      expect(req.queryParams?.minSourceDate).toEqual('2020-07-02')
      expect(req.queryParams?.maxSourceDate).toEqual('2020-07-14')
      expect(dateSpy).toBeCalledWith(dateNow.getTime() - params.newerThanDays! * 24 * 60 * 60 * 1000)
      expect(req.queryParams?.output).toEqual('json')
    })
  })

  describe('transforming the response', function() {
    const sampleResponse: modu.ModuResponse & JsonObject = {
      "modu": [
        {
          "name": "ABAN ABRAHAM",
          "date": "2018-09-18",
          "rigStatus": "Active",
          "specialStatus": "Wide Berth Requested",
          "distance": null,
          "latitude": 16.143055600000025,
          "longitude": 82.3066667,
          "position": "16°08'35\"N \n82°18'24\"E",
          "navArea": "HYDROPAC",
          "region": 6,
          "subregion": 63
        },
        {
          "name": "ABAN ICE",
          "date": "2020-05-03",
          "rigStatus": "Active",
          "specialStatus": "Wide Berth Requested",
          "distance": null,
          "latitude": 19.24799999999999,
          "longitude": 71.938666667,
          "position": "19°14'52.8\"N \n71°56'19.2\"E",
          "navArea": "HYDROPAC",
          "region": 6,
          "subregion": 63
        },
        {
          "name": "ABAN II",
          "date": "2019-11-27",
          "rigStatus": "Active",
          "specialStatus": "Wide Berth Requested",
          "distance": null,
          "latitude": 16.462333333000004,
          "longitude": 82.177166667,
          "position": "16°27'44.4\"N \n82°10'37.8\"E",
          "navArea": "HYDROPAC",
          "region": 6,
          "subregion": 63
        },
        {
          "name": "ABAN III",
          "date": "2020-04-20",
          "rigStatus": "Active",
          "specialStatus": "Wide Berth Requested",
          "distance": null,
          "latitude": 18.31066666700002,
          "longitude": 72.36366666700002,
          "position": "18°18'38.4\"N \n72°21'49.2\"E",
          "navArea": "HYDROPAC",
          "region": 6,
          "subregion": 63
        },
        {
          "name": "ABAN IV",
          "date": "2020-04-09",
          "rigStatus": "Active",
          "specialStatus": "Rig Removed",
          "distance": null,
          "latitude": 19.622500000000002,
          "longitude": 71.36099999999999,
          "position": "19°37'21\"N \n71°21'39.6\"E",
          "navArea": "HYDROPAC",
          "region": 6,
          "subregion": 63
        }
      ]
    }     

    it('transforms the modu response', async function() {

      const res: MsiResponse = {
        status: 200,
        body: sampleResponse
      }
      const req: MsiRequest = {
        method: 'get',
        path: '/whatever',
        queryParams: {}
      }
      const content = modu.transformResponse(res, req)

      expect(content.topic).toEqual(modu.topicDescriptor.id)
      expect(content).not.toHaveProperty('pageCursor')
      expect(content.items).toEqual<FeatureCollection>({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: sampleResponse.modu[0].name,
            properties: {
              ...sampleResponse.modu[0],
              timestamp: Date.parse(sampleResponse.modu[0].date)
            },
            geometry: {
              type: 'Point',
              coordinates: [sampleResponse.modu[0].longitude, sampleResponse.modu[0].latitude ]
            }
          },
          {
            type: 'Feature',
            id: sampleResponse.modu[1].name,
            properties: {
              ...sampleResponse.modu[1],
              timestamp: Date.parse(sampleResponse.modu[1].date)
            },
            geometry: {
              type: 'Point',
              coordinates: [sampleResponse.modu[1].longitude, sampleResponse.modu[1].latitude ]
            }
          },
          {
            type: 'Feature',
            id: sampleResponse.modu[2].name,
            properties: {
              ...sampleResponse.modu[2],
              timestamp: Date.parse(sampleResponse.modu[2].date)
            },
            geometry: {
              type: 'Point',
              coordinates: [sampleResponse.modu[2].longitude, sampleResponse.modu[2].latitude ]
            }
          },
          {
            type: 'Feature',
            id: sampleResponse.modu[3].name,
            properties: {
              ...sampleResponse.modu[3],
              timestamp: Date.parse(sampleResponse.modu[3].date)
            },
            geometry: {
              type: 'Point',
              coordinates: [sampleResponse.modu[3].longitude, sampleResponse.modu[3].latitude ]
            }
          },
          {
            type: 'Feature',
            id: sampleResponse.modu[4].name,
            properties: {
              ...sampleResponse.modu[4],
              timestamp: Date.parse(sampleResponse.modu[4].date)
            },
            geometry: {
              type: 'Point',
              coordinates: [sampleResponse.modu[4].longitude, sampleResponse.modu[4].latitude]
            }
          }
        ]
      })
    })
  })
})