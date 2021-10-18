import { JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import { FeedTopic, FeedTopicContent } from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds'
import { PluginResourceUrl } from '@ngageoint/mage.service/lib/entities/entities.global'
import { Feature } from 'geojson'
import { ParsedUrlQuery } from 'querystring'
import { MsiRequest, MsiResponse } from '../nga-msi'

export const topicDescriptor: FeedTopic = {
  id: 'modu',
  title: 'MODUs',
  summary: 'Mobile Offshore Drilling Units (MODUs) are facilities designed or modified to engage in drilling and exploration activities. The term MODU includes drilling vessels, semisubmersibles, submersibles, jack-ups, and similar facilities that can be moved without substantial effort. These facilities may or may not have self-propulsion equipment on board and may require dynamic positioning equipment or mooring systems to maintain their position.',
  icon: { sourceUrl: new PluginResourceUrl('@ngageoint/mage.nga-msi', 'icons/modu.png') },
  paramsSchema: {
    type: 'object',
    properties: {
      newerThanDays: {
        type: 'number',
        default: 56
      },
      rigStatus: {
        type: 'string',
        enum: ['Active', 'Inactive'],
        default: 'Active'
      }
    }
  },
  itemsHaveIdentity: true,
  itemsHaveSpatialDimension: true,
  itemPrimaryProperty: 'name',
  itemSecondaryProperty: 'rigStatus',
  itemTemporalProperty: 'timestamp',
  updateFrequencySeconds: 60 * 15,
  mapStyle: {
    icon: { sourceUrl: new PluginResourceUrl('@ngageoint/mage.nga-msi', 'icons/modu.png') }
  },
  itemPropertiesSchema: {
    type: 'object',
    properties: {
      date: {
        title: "Entry Date String",
        type: "string",
        format: 'date',
        pattern: "\d\d\d\d-\d\d-\d\d"
      },
      distance: {
        title: "Distance",
        type: "number"
      },
      latitude: {
        title: "Latitude",
        type: "number"
      },
      longitude: {
        title: "Longitude",
        type: "number"
      },
      name: {
        title: "Rig Name",
        type: "string"
      },
      navArea: {
        title: "Navigational Area",
        type: "string"
      },
      position: {
        title: "Position",
        type: "string",
        format: "latlondeg"
      },
      region: {
        title: "Charting Subregion",
        type: "number"
      },
      rigStatus: {
        title: "Rig Status",
        type: "string"
      },
      specialStatus: {
        title: "Special Status",
        type: "string"
      },
      subregion: {
        title: "Geographical Subregion",
        type: "number"
      },
      timestamp: {
        title: "Entry Date",
        type: "number",
        format: "date"
      }
    }
  }
}

export interface ModuTopicParams {
  newerThanDays?: number,
  status?: 'Active' | 'Inactive'
}

export interface ModuQueryParams extends ParsedUrlQuery {
  minSourceDate: string
  maxSourceDate: string
  name?: string
  status?: 'Active' | 'Inactive'
  navArea?: string
  subreg?: string
  output: 'json'
}

export interface ModuResponse extends JsonObject {
  modu: Modu[]
}

/**
 * A MODU is a Mobile Offshore Drilling Unit
 * Example MODU:
 * ```
 * {
 *   name: "ABAN ABRAHAM",
 *   date: "2018-09-18"
 *   latitude: 16.143055600000025
 *   longitude: 82.3066667
 *   position: "16°08'35"N ↵82°18'24"E"
 *   navArea: "HYDROPAC"
 *   region: 6
 *   subregion: 63
 *   rigStatus: "Active"
 *   distance: null ??
 *   specialStatus: "Wide Berth Requested"
 * }
 */
interface Modu extends JsonObject {
  /**
   * This appears to be the unique identifier for MODU records.
   */
  name: string,
  date: string,
  latitude: number,
  longitude: number,
  position: string, //DMS Lat/Lon string
  navArea: string,
  region: number,
  subregion: number,
  rigStatus: 'Active' | 'Inactive',
  distance?: string | null,
  specialStatus?: string | null
}

const geoJsonFromModu = (x: Modu): Feature => {
  const feature: Feature = {
    type: 'Feature',
    id: x.name,
    properties: { ...x, timestamp: Date.parse(x.date) },
    geometry: {
      type: 'Point',
      coordinates: [ x.longitude, x.latitude ]
    }
  }

  return feature;
}

const formatDateQueryParam = (x: Date): string => {
  const month = `${x.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${x.getUTCDate()}`.padStart(2, '0')
  return `${x.getUTCFullYear()}-${month}-${day}`
}

export const createContentRequest = (params?: ModuTopicParams): MsiRequest => {
  const newerThanDays = params?.newerThanDays ||
    topicDescriptor.paramsSchema?.properties?.newerThanDays.default as number
  const status = params?.status
  const maxSourceDate = new Date()
  const minSourceDate = new Date(maxSourceDate.getTime() - newerThanDays * 24 * 60 * 60 * 1000)
  const queryParams: ModuQueryParams = {
    minSourceDate: formatDateQueryParam(minSourceDate),
    maxSourceDate: formatDateQueryParam(maxSourceDate),
    status: status,
    output: 'json'
  }
  return {
    method: 'get',
    path: '/api/publications/modu',
    queryParams
  }
}

export const transformResponse = (res: MsiResponse, req: MsiRequest): FeedTopicContent => {
  const moduResponse = res.body as ModuResponse
  return {
    topic: topicDescriptor.id,
    items: {
      type: 'FeatureCollection',
      features: moduResponse.modu.map(geoJsonFromModu)
    }
  }
}
