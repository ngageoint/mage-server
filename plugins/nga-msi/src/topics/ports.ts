import { JSONSchema4, JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import { FeedTopic, FeedTopicContent } from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds'
import { PluginResourceUrl } from '@ngageoint/mage.service/lib/entities/entities.global'
import { Feature } from 'geojson'
import { ParsedUrlQuery } from 'querystring'
import { MsiRequest, MsiResponse } from '../nga-msi'

/**
 * Most World Port Index facility/service fields are three-valued: Yes, No, or
 * Unknown (absence of information, as distinct from a known "No").  The raw
 * 'Y' | 'N' | 'U' codes are translated to these labels before the feed item
 * is returned; see {@link decisionLabels}.
 */
const yesNoUnknown = (title: string): JSONSchema4 => ({
  title,
  type: 'string',
  enum: [ 'Yes', 'No', 'Unknown' ]
})

const meters = (title: string): JSONSchema4 => ({
  title,
  type: [ 'string', 'number' ]
})

export const topicDescriptor: FeedTopic = {
  id: 'ports',
  title: 'World Ports',
  summary: 'The World Port Index (Pub 150) contains the location and physical characteristics of, and the facilities and services available at, major ports throughout the world.',
  icon: { sourceUrl: new PluginResourceUrl('@ngageoint/mage.nga-msi', 'icons/port_feed_icon.png') },
  paramsSchema: {
    type: 'object',
    properties: {
      countryName: {
        title: 'Country',
        type: 'string',
        description: 'Only include ports in the given country'
      },
      harborSize: {
        title: 'Minimum Harbor Size',
        type: 'string',
        enum: [ 'V', 'S', 'M', 'L' ],
        description: 'Only include ports at least this size: Very Small (V), Small (S), Medium (M), or Large (L)'
      }
    }
  },
  itemsHaveIdentity: true,
  itemsHaveSpatialDimension: true,
  itemPrimaryProperty: 'portName',
  itemSecondaryProperty: 'countryName',
  updateFrequencySeconds: 60 * 60 * 24,
  mapStyle: {
    icon: { sourceUrl: new PluginResourceUrl('@ngageoint/mage.nga-msi', 'icons/port_map_icon.png') }
  },
  /**
   * Field titles and descriptions are drawn from NGA's "World Port Index -
   * Explanation of Data Fields" reference document.
   */
  itemPropertiesSchema: {
    type: 'object',
    properties: {
      portNumber: {
        title: 'WPI Number',
        type: 'number',
        description: 'Unique number assigned to this port by NGA; consistent between updates and referenced in NGA Sailing Directions.'
      },
      portName: {
        title: 'Port Name',
        type: 'string'
      },
      alternateName: {
        title: 'Alternate Port Name',
        type: 'string'
      },
      unloCode: {
        title: 'UN/LOCODE',
        type: 'string'
      },
      regionName: {
        title: 'Region Name',
        type: 'string'
      },
      countryName: {
        title: 'Country',
        type: 'string'
      },
      countryCode: {
        title: 'Country Code',
        type: 'string'
      },
      navArea: {
        title: 'NAVAREA',
        type: 'string'
      },
      dodWaterBody: {
        title: 'World Water Body',
        type: 'string'
      },
      s121WaterBody: {
        title: 'IHO S-130 Sea Area',
        type: 'string'
      },
      ycoord: {
        title: 'Latitude',
        type: 'number'
      },
      xcoord: {
        title: 'Longitude',
        type: 'number'
      },
      latitude: {
        title: 'Latitude (DMS)',
        type: 'string'
      },
      longitude: {
        title: 'Longitude (DMS)',
        type: 'string'
      },
      publicationNumber: {
        title: 'Sailing Direction or Publication',
        type: 'string'
      },
      chartNumber: {
        title: 'Standard Nautical Chart',
        type: 'string'
      },
      s57Enc: {
        title: 'S-57 Electronic Navigational Chart',
        type: 'string'
      },
      s101Enc: {
        title: 'S-101 Electronic Navigational Chart',
        type: 'string'
      },
      dnc: {
        title: 'Digital Nautical Chart',
        type: 'string'
      },
      harborSize: {
        title: 'Harbor Size',
        type: 'string',
        enum: [ 'Very Small', 'Small', 'Medium', 'Large' ],
        description: 'Based on area, facilities, and wharf space.'
      },
      harborType: {
        title: 'Harbor Type',
        type: 'string',
        enum: [ 'Coastal Natural', 'Coastal Breakwater', 'Coastal Tide Gate', 'River Natural', 'River Basin', 'River Tide Gate', 'Lake or Canal', 'Open Roadstead' ],
        description: 'The physical characteristics of the harbor.'
      },
      harborUse: {
        title: 'Harbor Use',
        type: 'string',
        enum: [ 'Fishing', 'Military', 'Cargo', 'Ferry', 'Unknown' ],
        description: 'The primary use of the harbor.'
      },
      shelter: {
        title: 'Shelter Afforded',
        type: 'string',
        enum: [ 'Excellent', 'Good', 'Fair', 'Poor', 'None', 'Unknown' ],
        description: 'Shelter from wind, sea, and swell where normal port operations are conducted.'
      },
      tide: {
        title: 'Tidal Range (m)',
        type: 'number'
      },
      entranceWidth: {
        title: 'Entrance Width (m)',
        type: 'number'
      },
      chDepth: meters('Channel Depth (m)'),
      anDepth: meters('Anchorage Depth (m)'),
      cpDepth: meters('Cargo Pier Depth (m)'),
      otDepth: meters('Oil Terminal Depth (m)'),
      lngTerminalDepth: {
        title: 'LNG Terminal Depth (m)',
        type: 'number'
      },
      maxVesselLength: meters('Maximum Vessel Length (m)'),
      maxVesselBeam: meters('Maximum Vessel Beam (m)'),
      maxVesselDraft: meters('Maximum Vessel Draft (m)'),
      offMaxVesselLength: {
        title: 'Offshore Maximum Vessel Length (m)',
        type: 'number'
      },
      offMaxVesselBeam: {
        title: 'Offshore Maximum Vessel Beam (m)',
        type: 'number'
      },
      offMaxVesselDraft: {
        title: 'Offshore Maximum Vessel Draft (m)',
        type: 'number'
      },
      overheadLimits: yesNoUnknown('Overhead Limits'),
      erTide: yesNoUnknown('Entrance Restriction - Tide'),
      erSwell: yesNoUnknown('Entrance Restriction - Heavy Swell'),
      erIce: yesNoUnknown('Entrance Restriction - Ice'),
      erOther: yesNoUnknown('Entrance Restriction - Other'),
      ukcMgmtSystem: {
        title: 'Underkeel Clearance Management System',
        type: 'string',
        enum: [ 'Static', 'Dynamic', 'None', 'Unknown' ],
        description: 'The type of underkeel clearance management system in use, if any.'
      },
      goodHoldingGround: yesNoUnknown('Good Holding Ground'),
      turningArea: yesNoUnknown('Turning Area'),
      portSecurity: yesNoUnknown('Port Security (ISPS)'),
      etaMessage: yesNoUnknown('ETA Message Required'),
      qtPratique: yesNoUnknown('Quarantine - Pratique'),
      qtSanitation: yesNoUnknown('Quarantine - Sanitation'),
      qtOther: yesNoUnknown('Quarantine - Other'),
      tss: yesNoUnknown('Traffic Separation Scheme'),
      vts: yesNoUnknown('Vessel Traffic Service'),
      firstPortOfEntry: yesNoUnknown('First Port of Entry'),
      usRep: yesNoUnknown('US Representative'),
      ptCompulsory: yesNoUnknown('Pilotage - Compulsory'),
      ptAvailable: yesNoUnknown('Pilotage - Available'),
      ptLocalAssist: yesNoUnknown('Pilotage - Local Assistance'),
      ptAdvisable: yesNoUnknown('Pilotage - Advisable'),
      tugsSalvage: yesNoUnknown('Tugs - Salvage'),
      tugsAssist: yesNoUnknown('Tugs - Assistance'),
      cmTelephone: yesNoUnknown('Communications - Telephone'),
      cmTelegraph: yesNoUnknown('Communications - Telefax'),
      cmRadio: yesNoUnknown('Communications - Radio'),
      cmRadioTel: yesNoUnknown('Communications - Radiotelephone'),
      cmAir: yesNoUnknown('Communications - Airport'),
      cmRail: yesNoUnknown('Communications - Rail'),
      searchAndRescue: yesNoUnknown('Search and Rescue'),
      loWharves: yesNoUnknown('Facilities - Wharves'),
      loAnchor: yesNoUnknown('Facilities - Anchorage'),
      loDangCargo: yesNoUnknown('Facilities - Dangerous Cargo Anchorage'),
      loMedMoor: yesNoUnknown('Facilities - Med Mooring'),
      loBeachMoor: yesNoUnknown('Facilities - Beach Mooring'),
      loIceMoor: yesNoUnknown('Facilities - Ice Mooring'),
      loRoro: yesNoUnknown('Facilities - RoRo'),
      loSolidBulk: yesNoUnknown('Facilities - Solid Bulk'),
      loLiquidBulk: yesNoUnknown('Facilities - Liquid Bulk'),
      loContainer: yesNoUnknown('Facilities - Container'),
      loBreakBulk: yesNoUnknown('Facilities - Breakbulk'),
      loOilTerm: yesNoUnknown('Facilities - Oil Terminal'),
      loLongTerm: yesNoUnknown('Facilities - LNG Terminal'),
      loOther: yesNoUnknown('Facilities - Other'),
      medFacilities: yesNoUnknown('Medical Facilities'),
      garbageDisposal: yesNoUnknown('Garbage Disposal'),
      cht: yesNoUnknown('Chemical Holding Tank Disposal'),
      degauss: yesNoUnknown('Degaussing'),
      dirtyBallast: yesNoUnknown('Dirty Ballast Disposal'),
      crFixed: yesNoUnknown('Cranes - Fixed'),
      crMobile: yesNoUnknown('Cranes - Mobile'),
      crFloating: yesNoUnknown('Cranes - Floating'),
      cranesContainer: yesNoUnknown('Cranes - Container'),
      lifts100: yesNoUnknown('Lifts - 100+ Tons'),
      lifts50: yesNoUnknown('Lifts - 50-100 Tons'),
      lifts25: yesNoUnknown('Lifts - 25-49 Tons'),
      lifts0: yesNoUnknown('Lifts - 0-24 Tons'),
      srLongshore: yesNoUnknown('Services - Longshoremen'),
      srElectrical: yesNoUnknown('Services - Electricity'),
      srSteam: yesNoUnknown('Services - Steam'),
      srNavigEquip: yesNoUnknown('Services - Navigation Equipment'),
      srElectRepair: yesNoUnknown('Services - Electrical Repair'),
      srIceBreaking: yesNoUnknown('Services - Ice Breaking'),
      srDiving: yesNoUnknown('Services - Diving'),
      suProvisions: yesNoUnknown('Supplies - Provisions'),
      suWater: yesNoUnknown('Supplies - Potable Water'),
      suFuel: yesNoUnknown('Supplies - Fuel Oil'),
      suDiesel: yesNoUnknown('Supplies - Diesel Oil'),
      suAviationFuel: yesNoUnknown('Supplies - Aviation Fuel'),
      suDeck: yesNoUnknown('Supplies - Deck'),
      suEngine: yesNoUnknown('Supplies - Engine'),
      repairCode: {
        title: 'Repairs',
        type: 'string',
        enum: [ 'Major', 'Moderate', 'Limited', 'Emergency Only', 'None', 'Unknown' ],
        description: 'The extent of repairs available.'
      },
      drydock: {
        title: 'Dry Dock',
        type: 'string',
        enum: [ 'Large', 'Medium', 'Small', 'None', 'Unknown' ],
        description: 'Large (301m+), Medium (201-300m), Small (up to 200m), None, or Unknown.'
      },
      railway: {
        title: 'Railway',
        type: 'string',
        enum: [ 'Large', 'Medium', 'Small', 'None', 'Unknown' ],
        description: 'Large (over 1000 tons), Medium (201-1000 tons), Small (up to 200 tons), None, or Unknown.'
      }
    }
  }
}

export interface PortsTopicParams {
  countryName?: string
  harborSize?: 'V' | 'S' | 'M' | 'L'
}

export interface PortsQueryParams extends ParsedUrlQuery {
  countryName?: string
  harborSize?: string
  output: 'json'
}

export interface PortsResponse extends JsonObject {
  ports: Port[]
}

/**
 * A Port is an entry from the NGA World Port Index (Pub 150).  This mirrors
 * the fields documented in NGA's "World Port Index - Explanation of Data
 * Fields" reference; see `itemPropertiesSchema` above for field meanings.
 */
interface Port extends JsonObject {
  portNumber: number,
  portName: string,
  alternateName: string | null,
  unloCode: string | null,
  regionNumber: number,
  regionName: string,
  countryCode: string,
  countryName: string,
  navArea: string,
  dodWaterBody: string | null,
  s121WaterBody: string | null,
  ycoord: number,
  xcoord: number,
  latitude: string,
  longitude: string,
  publicationNumber: string | null,
  chartNumber: string | null,
  s57Enc: string | null,
  s101Enc: string | null,
  dnc: string | null,
  harborSize: 'V' | 'S' | 'M' | 'L' | null,
  harborType: string | null,
  harborUse: string | null,
  shelter: 'E' | 'G' | 'F' | 'P' | 'N' | 'U' | null,
  tide: number | null,
  entranceWidth: number | null,
  chDepth: string | null,
  anDepth: string | null,
  cpDepth: string | null,
  otDepth: string | null,
  lngTerminalDepth: number | null,
  maxVesselLength: string | null,
  maxVesselBeam: string | null,
  maxVesselDraft: string | null,
  offMaxVesselLength: number | null,
  offMaxVesselBeam: number | null,
  offMaxVesselDraft: number | null,
  overheadLimits: string | null,
  erTide: string | null,
  erSwell: string | null,
  erIce: string | null,
  erOther: string | null,
  ukcMgmtSystem: string | null,
  goodHoldingGround: string | null,
  turningArea: string | null,
  portSecurity: string | null,
  etaMessage: string | null,
  qtPratique: string | null,
  qtSanitation: string | null,
  qtOther: string | null,
  tss: string | null,
  vts: string | null,
  firstPortOfEntry: string | null,
  usRep: string | null,
  ptCompulsory: string | null,
  ptAvailable: string | null,
  ptLocalAssist: string | null,
  ptAdvisable: string | null,
  tugsSalvage: string | null,
  tugsAssist: string | null,
  cmTelephone: string | null,
  cmTelegraph: string | null,
  cmRadio: string | null,
  cmRadioTel: string | null,
  cmAir: string | null,
  cmRail: string | null,
  searchAndRescue: string | null,
  loWharves: string | null,
  loAnchor: string | null,
  loDangCargo: string | null,
  loMedMoor: string | null,
  loBeachMoor: string | null,
  loIceMoor: string | null,
  loRoro: string | null,
  loSolidBulk: string | null,
  loLiquidBulk: string | null,
  loContainer: string | null,
  loBreakBulk: string | null,
  loOilTerm: string | null,
  loLongTerm: string | null,
  loOther: string | null,
  medFacilities: string | null,
  garbageDisposal: string | null,
  cht: string | null,
  degauss: string | null,
  dirtyBallast: string | null,
  crFixed: string | null,
  crMobile: string | null,
  crFloating: string | null,
  cranesContainer: string | null,
  lifts100: string | null,
  lifts50: string | null,
  lifts25: string | null,
  lifts0: string | null,
  srLongshore: string | null,
  srElectrical: string | null,
  srSteam: string | null,
  srNavigEquip: string | null,
  srElectRepair: string | null,
  srIceBreaking: string | null,
  srDiving: string | null,
  suProvisions: string | null,
  suWater: string | null,
  suFuel: string | null,
  suDiesel: string | null,
  suAviationFuel: string | null,
  suDeck: string | null,
  suEngine: string | null,
  repairCode: string | null,
  drydock: string | null,
  railway: string | null,
  globalId: string
}

/**
 * The World Port Index API returns short codes for many fields.  These maps
 * translate those codes to human readable text for display, mirroring the
 * translation manta-android performs for the same fields (see
 * ai.vectornorth.manta.datasource.port.types.*).
 */
const decisionLabels: Record<string, string> = { Y: 'Yes', N: 'No', U: 'Unknown' }
const harborSizeLabels: Record<string, string> = { V: 'Very Small', S: 'Small', M: 'Medium', L: 'Large' }
const harborTypeLabels: Record<string, string> = {
  CN: 'Coastal Natural',
  CB: 'Coastal Breakwater',
  CT: 'Coastal Tide Gate',
  RN: 'River Natural',
  RB: 'River Basin',
  RT: 'River Tide Gate',
  LC: 'Lake or Canal',
  OR: 'Open Roadstead'
}
const harborUseLabels: Record<string, string> = { Fish: 'Fishing', Mil: 'Military', Cargo: 'Cargo', Ferry: 'Ferry', UNK: 'Unknown' }
const shelterLabels: Record<string, string> = { E: 'Excellent', G: 'Good', F: 'Fair', P: 'Poor', N: 'None', U: 'Unknown' }
const underkeelClearanceLabels: Record<string, string> = { S: 'Static', D: 'Dynamic', N: 'None', U: 'Unknown' }
const repairCodeLabels: Record<string, string> = { A: 'Major', B: 'Moderate', C: 'Limited', D: 'Emergency Only', N: 'None', U: 'Unknown' }
const sizeLabels: Record<string, string> = { L: 'Large', M: 'Medium', S: 'Small', N: 'None', U: 'Unknown' }

/**
 * Fields whose raw values are Yes/No/Unknown decision codes.
 */
const decisionFields: (keyof Port)[] = [
  'overheadLimits', 'erTide', 'erSwell', 'erIce', 'erOther', 'goodHoldingGround', 'turningArea',
  'portSecurity', 'etaMessage', 'qtPratique', 'qtSanitation', 'qtOther', 'tss', 'vts',
  'firstPortOfEntry', 'usRep', 'ptCompulsory', 'ptAvailable', 'ptLocalAssist', 'ptAdvisable',
  'tugsSalvage', 'tugsAssist', 'cmTelephone', 'cmTelegraph', 'cmRadio', 'cmRadioTel', 'cmAir', 'cmRail',
  'searchAndRescue', 'loWharves', 'loAnchor', 'loDangCargo', 'loMedMoor', 'loBeachMoor', 'loIceMoor',
  'loRoro', 'loSolidBulk', 'loLiquidBulk', 'loContainer', 'loBreakBulk', 'loOilTerm', 'loLongTerm', 'loOther',
  'medFacilities', 'garbageDisposal', 'cht', 'degauss', 'dirtyBallast', 'crFixed', 'crMobile', 'crFloating',
  'cranesContainer', 'lifts100', 'lifts50', 'lifts25', 'lifts0', 'srLongshore', 'srElectrical', 'srSteam',
  'srNavigEquip', 'srElectRepair', 'srIceBreaking', 'srDiving', 'suProvisions', 'suWater', 'suFuel', 'suDiesel',
  'suAviationFuel', 'suDeck', 'suEngine'
]

const translate = (labels: Record<string, string>, value: string | null): string | null => {
  if (value == null) {
    return null
  }
  return labels[value] ?? value
}

const geoJsonFromPort = (x: Port): Feature => {
  const properties: JsonObject = { ...x }
  for (const field of decisionFields) {
    properties[field] = translate(decisionLabels, x[field] as string | null)
  }
  properties.harborSize = translate(harborSizeLabels, x.harborSize)
  properties.harborType = translate(harborTypeLabels, x.harborType)
  properties.harborUse = translate(harborUseLabels, x.harborUse)
  properties.shelter = translate(shelterLabels, x.shelter)
  properties.ukcMgmtSystem = translate(underkeelClearanceLabels, x.ukcMgmtSystem)
  properties.repairCode = translate(repairCodeLabels, x.repairCode)
  properties.drydock = translate(sizeLabels, x.drydock)
  properties.railway = translate(sizeLabels, x.railway)

  return {
    type: 'Feature',
    id: x.portNumber,
    properties,
    geometry: {
      type: 'Point',
      coordinates: [ x.xcoord, x.ycoord ]
    }
  }
}

export const createContentRequest = (params?: PortsTopicParams): MsiRequest => {
  const queryParams: PortsQueryParams = {
    countryName: params?.countryName,
    harborSize: params?.harborSize,
    output: 'json'
  }
  return {
    method: 'get',
    path: '/api/publications/world-port-index',
    queryParams
  }
}

export const transformResponse = (res: MsiResponse, req: MsiRequest): FeedTopicContent => {
  const portsResponse = res.body as PortsResponse
  return {
    topic: topicDescriptor.id,
    items: {
      type: 'FeatureCollection',
      features: portsResponse.ports.map(geoJsonFromPort)
    }
  }
}
