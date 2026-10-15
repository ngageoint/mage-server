import * as ports from './ports'
import { MsiResponse, MsiRequest } from '../nga-msi'
import { JsonObject } from '@ngageoint/mage.service/lib/entities/entities.json_types'
import { describe, it, expect } from '@jest/globals'

type Port = ports.PortsResponse['ports'][number]

const makePort = (overrides: Partial<Port> = {}): Port => ({
  portNumber: 1,
  portName: 'Test Port',
  alternateName: null,
  unloCode: null,
  regionNumber: 1,
  regionName: 'Test Region',
  countryCode: 'US',
  countryName: 'United States',
  navArea: 'HYDROLANT',
  dodWaterBody: null,
  s121WaterBody: null,
  ycoord: 10,
  xcoord: 20,
  latitude: `10°00'00"N`,
  longitude: `20°00'00"E`,
  publicationNumber: null,
  chartNumber: null,
  s57Enc: null,
  s101Enc: null,
  dnc: null,
  harborSize: null,
  harborType: null,
  harborUse: null,
  shelter: null,
  tide: null,
  entranceWidth: null,
  chDepth: null,
  anDepth: null,
  cpDepth: null,
  otDepth: null,
  lngTerminalDepth: null,
  maxVesselLength: null,
  maxVesselBeam: null,
  maxVesselDraft: null,
  offMaxVesselLength: null,
  offMaxVesselBeam: null,
  offMaxVesselDraft: null,
  overheadLimits: null,
  erTide: null,
  erSwell: null,
  erIce: null,
  erOther: null,
  ukcMgmtSystem: null,
  goodHoldingGround: null,
  turningArea: null,
  portSecurity: null,
  etaMessage: null,
  qtPratique: null,
  qtSanitation: null,
  qtOther: null,
  tss: null,
  vts: null,
  firstPortOfEntry: null,
  usRep: null,
  ptCompulsory: null,
  ptAvailable: null,
  ptLocalAssist: null,
  ptAdvisable: null,
  tugsSalvage: null,
  tugsAssist: null,
  cmTelephone: null,
  cmTelegraph: null,
  cmRadio: null,
  cmRadioTel: null,
  cmAir: null,
  cmRail: null,
  searchAndRescue: null,
  loWharves: null,
  loAnchor: null,
  loDangCargo: null,
  loMedMoor: null,
  loBeachMoor: null,
  loIceMoor: null,
  loRoro: null,
  loSolidBulk: null,
  loLiquidBulk: null,
  loContainer: null,
  loBreakBulk: null,
  loOilTerm: null,
  loLongTerm: null,
  loOther: null,
  medFacilities: null,
  garbageDisposal: null,
  cht: null,
  degauss: null,
  dirtyBallast: null,
  crFixed: null,
  crMobile: null,
  crFloating: null,
  cranesContainer: null,
  lifts100: null,
  lifts50: null,
  lifts25: null,
  lifts0: null,
  srLongshore: null,
  srElectrical: null,
  srSteam: null,
  srNavigEquip: null,
  srElectRepair: null,
  srIceBreaking: null,
  srDiving: null,
  suProvisions: null,
  suWater: null,
  suFuel: null,
  suDiesel: null,
  suAviationFuel: null,
  suDeck: null,
  suEngine: null,
  repairCode: null,
  drydock: null,
  railway: null,
  globalId: 'abc123',
  ...overrides
})

const transformPort = (port: Port): JsonObject => {
  const res: MsiResponse = { status: 200, body: { ports: [ port ] } }
  const req: MsiRequest = { method: 'get', path: '/whatever', queryParams: {} }
  const content = ports.transformResponse(res, req)
  return (content.items as { features: { properties: JsonObject }[] }).features[0].properties
}

describe('ports topic module', function () {

  it('provides a topic descriptor', function () {
    const descriptor = ports.topicDescriptor
    expect(descriptor.id).toEqual('ports')
    expect(descriptor.itemsHaveIdentity).toEqual(true)
    expect(descriptor.itemsHaveSpatialDimension).toEqual(true)
    expect(descriptor.itemPrimaryProperty).toEqual('portName')
    expect(descriptor.itemSecondaryProperty).toEqual('countryName')
  })

  describe('creating requests', function () {
    it('passes the country and harbor size filters through as query params', function () {
      const params: ports.PortsTopicParams = {
        countryName: 'United States',
        harborSize: 'M'
      }

      const req = ports.createContentRequest(params)

      expect(req.method).toEqual('get')
      expect(req.path).toEqual('/api/publications/world-port-index')
      expect(req.queryParams?.countryName).toEqual('United States')
      expect(req.queryParams?.harborSize).toEqual('M')
      expect(req.queryParams?.output).toEqual('json')
    })

    it('omits the filters when no params are given', function () {
      const req = ports.createContentRequest()

      expect(req.queryParams?.countryName).toBeUndefined()
      expect(req.queryParams?.harborSize).toBeUndefined()
      expect(req.queryParams?.output).toEqual('json')
    })
  })

  describe('transforming the response', function () {

    it('maps port number, coordinates, and geometry', function () {
      const port = makePort({ portNumber: 42, xcoord: -71.5, ycoord: 41.8 })
      const res: MsiResponse = { status: 200, body: { ports: [ port ] } }
      const req: MsiRequest = { method: 'get', path: '/whatever', queryParams: {} }

      const content = ports.transformResponse(res, req)

      expect(content.topic).toEqual(ports.topicDescriptor.id)
      const feature = (content.items as { features: any[] }).features[0]
      expect(feature.id).toEqual(42)
      expect(feature.geometry).toEqual({ type: 'Point', coordinates: [ -71.5, 41.8 ] })
    })

    it.each([
      [ 'Y', 'Yes' ],
      [ 'N', 'No' ],
      [ 'U', 'Unknown' ]
    ])('translates decision code %s to %s', function (code, label) {
      // spot-check a handful of the ~70 decision fields to confirm the
      // shared decisionFields loop, not just a single hard-coded field
      const properties = transformPort(makePort({
        overheadLimits: code as any,
        cmRadio: code as any,
        suEngine: code as any
      }))

      expect(properties.overheadLimits).toEqual(label)
      expect(properties.cmRadio).toEqual(label)
      expect(properties.suEngine).toEqual(label)
    })

    it.each([
      [ 'V', 'Very Small' ],
      [ 'S', 'Small' ],
      [ 'M', 'Medium' ],
      [ 'L', 'Large' ]
    ])('translates harbor size code %s to %s', function (code, label) {
      const properties = transformPort(makePort({ harborSize: code as any }))
      expect(properties.harborSize).toEqual(label)
    })

    it.each([
      [ 'CN', 'Coastal Natural' ],
      [ 'CB', 'Coastal Breakwater' ],
      [ 'CT', 'Coastal Tide Gate' ],
      [ 'RN', 'River Natural' ],
      [ 'RB', 'River Basin' ],
      [ 'RT', 'River Tide Gate' ],
      [ 'LC', 'Lake or Canal' ],
      [ 'OR', 'Open Roadstead' ]
    ])('translates harbor type code %s to %s', function (code, label) {
      const properties = transformPort(makePort({ harborType: code }))
      expect(properties.harborType).toEqual(label)
    })

    it.each([
      [ 'Fish', 'Fishing' ],
      [ 'Mil', 'Military' ],
      [ 'Cargo', 'Cargo' ],
      [ 'Ferry', 'Ferry' ],
      [ 'UNK', 'Unknown' ]
    ])('translates harbor use code %s to %s', function (code, label) {
      const properties = transformPort(makePort({ harborUse: code }))
      expect(properties.harborUse).toEqual(label)
    })

    it.each([
      [ 'E', 'Excellent' ],
      [ 'G', 'Good' ],
      [ 'F', 'Fair' ],
      [ 'P', 'Poor' ],
      [ 'N', 'None' ],
      [ 'U', 'Unknown' ]
    ])('translates shelter code %s to %s', function (code, label) {
      const properties = transformPort(makePort({ shelter: code as any }))
      expect(properties.shelter).toEqual(label)
    })

    it.each([
      [ 'S', 'Static' ],
      [ 'D', 'Dynamic' ],
      [ 'N', 'None' ],
      [ 'U', 'Unknown' ]
    ])('translates underkeel clearance code %s to %s', function (code, label) {
      const properties = transformPort(makePort({ ukcMgmtSystem: code }))
      expect(properties.ukcMgmtSystem).toEqual(label)
    })

    it.each([
      [ 'A', 'Major' ],
      [ 'B', 'Moderate' ],
      [ 'C', 'Limited' ],
      [ 'D', 'Emergency Only' ],
      [ 'N', 'None' ],
      [ 'U', 'Unknown' ]
    ])('translates repair code %s to %s', function (code, label) {
      const properties = transformPort(makePort({ repairCode: code }))
      expect(properties.repairCode).toEqual(label)
    })

    it.each([
      [ 'L', 'Large' ],
      [ 'M', 'Medium' ],
      [ 'S', 'Small' ],
      [ 'N', 'None' ],
      [ 'U', 'Unknown' ]
    ])('translates dry dock and railway size code %s to %s', function (code, label) {
      const properties = transformPort(makePort({ drydock: code, railway: code }))
      expect(properties.drydock).toEqual(label)
      expect(properties.railway).toEqual(label)
    })

    it('passes through a code that is not in the label map unchanged', function () {
      const properties = transformPort(makePort({ harborSize: 'X' as any }))
      expect(properties.harborSize).toEqual('X')
    })

    it('leaves null fields as null instead of mapping them to a label', function () {
      const properties = transformPort(makePort({
        harborSize: null,
        harborType: null,
        shelter: null,
        overheadLimits: null
      }))

      expect(properties.harborSize).toBeNull()
      expect(properties.harborType).toBeNull()
      expect(properties.shelter).toBeNull()
      expect(properties.overheadLimits).toBeNull()
    })
  })
})
