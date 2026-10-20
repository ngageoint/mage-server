import { URL } from 'url'
import { fetchContent, topicDescriptor } from './cot-events'
import { AtakRequest, AtakResponse, AtakTransport } from '../atak'

const validCotXml = (uid: string, overrides: { type?: string, start?: string } = {}) => `
<event uid="${uid}" type="${overrides.type ?? 'a-f-G-U-C'}" time="2026-05-11T08:30:00.000Z" start="${overrides.start ?? '2026-05-11T08:30:00.000Z'}" stale="2026-05-11T08:31:00.000Z">
  <point lat="48.3794" lon="31.1656" hae="150.0" ce="10.0" le="5.0"/>
</event>
`

const baseUrl = new URL('http://test.tak')

const clientEndpointsRes = (uids: string[], overrides: Record<string, { callsign?: string, lastStatus?: string }> = {}): AtakResponse => ({
  status: 200,
  body: {
    data: uids.map(uid => ({
      uid,
      callsign: overrides[uid]?.callsign ?? uid,
      lastStatus: overrides[uid]?.lastStatus ?? 'Connected'
    }))
  } as any
})

describe('cot-events fetchContent', () => {

  let warnSpy: jest.SpyInstance
  let transport: { send: jest.Mock }

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    transport = { send: jest.fn() }
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('discovers devices via clientEndPoints and fetches each one\'s position', async () => {
    transport.send.mockImplementation(async (req: AtakRequest): Promise<AtakResponse> => {
      if (req.path === '/Marti/api/clientEndPoints') {
        return clientEndpointsRes(['ALPHA-1-1', 'BRAVO-2-2'])
      }
      const uid = req.path.split('/').pop() as string
      return { status: 200, body: validCotXml(uid) }
    })

    const content = await fetchContent(transport as unknown as AtakTransport, baseUrl, undefined)

    expect(content.topic).toBe(topicDescriptor.id)
    expect(content.items.features).toHaveLength(2)
    expect(content.items.features.map(f => f.id)).toEqual(['ALPHA-1-1', 'BRAVO-2-2'])
    expect(transport.send).toHaveBeenCalledTimes(3)
  })

  it('returns an empty FeatureCollection when no devices are registered', async () => {
    transport.send.mockResolvedValueOnce(clientEndpointsRes([]))

    const content = await fetchContent(transport as unknown as AtakTransport, baseUrl, undefined)

    expect(content.items).toEqual({ type: 'FeatureCollection', features: [] })
    expect(transport.send).toHaveBeenCalledTimes(1)
  })

  it('skips a device whose position is unparseable, without failing the others', async () => {
    transport.send.mockImplementation(async (req: AtakRequest): Promise<AtakResponse> => {
      if (req.path === '/Marti/api/clientEndPoints') {
        return clientEndpointsRes(['ALPHA-1-1', 'BROKEN-1'])
      }
      if (req.path.endsWith('BROKEN-1')) {
        return { status: 200, body: '<event uid="broken"' }
      }
      const uid = req.path.split('/').pop() as string
      return { status: 200, body: validCotXml(uid) }
    })

    const content = await fetchContent(transport as unknown as AtakTransport, baseUrl, undefined)

    expect(content.items.features).toHaveLength(1)
    expect(content.items.features[0].id).toBe('ALPHA-1-1')
    expect(warnSpy).toHaveBeenCalled()
  })

  it('skips a device whose position fetch rejects, without failing the others', async () => {
    transport.send.mockImplementation(async (req: AtakRequest): Promise<AtakResponse> => {
      if (req.path === '/Marti/api/clientEndPoints') {
        return clientEndpointsRes(['ALPHA-1-1', 'FAILS-1'])
      }
      if (req.path.endsWith('FAILS-1')) {
        throw new Error('network error')
      }
      const uid = req.path.split('/').pop() as string
      return { status: 200, body: validCotXml(uid) }
    })

    const content = await fetchContent(transport as unknown as AtakTransport, baseUrl, undefined)

    expect(content.items.features).toHaveLength(1)
    expect(content.items.features[0].id).toBe('ALPHA-1-1')
    expect(warnSpy).toHaveBeenCalled()
  })

  it('falls back to uid for callsign when the event has no contact detail', async () => {
    transport.send.mockImplementation(async (req: AtakRequest): Promise<AtakResponse> => {
      if (req.path === '/Marti/api/clientEndPoints') {
        return clientEndpointsRes(['ALPHA-1-1'])
      }
      return { status: 200, body: validCotXml('ALPHA-1-1') }
    })

    const content = await fetchContent(transport as unknown as AtakTransport, baseUrl, undefined)

    expect(content.items.features[0].properties?.callsign).toBe('ALPHA-1-1')
  })

  it('returns an empty FeatureCollection when clientEndPoints responds with an unexpected shape', async () => {
    transport.send.mockResolvedValueOnce({ status: 200, body: { unexpected: 'shape' } as any })

    const content = await fetchContent(transport as unknown as AtakTransport, baseUrl, undefined)

    expect(content.items).toEqual({ type: 'FeatureCollection', features: [] })
  })

  it('connectedOnly excludes disconnected devices before fetching their position', async () => {
    transport.send.mockImplementation(async (req: AtakRequest): Promise<AtakResponse> => {
      if (req.path === '/Marti/api/clientEndPoints') {
        return clientEndpointsRes(['ALPHA-1-1', 'OFFLINE-1'], { 'OFFLINE-1': { lastStatus: 'Disconnected' } })
      }
      const uid = req.path.split('/').pop() as string
      return { status: 200, body: validCotXml(uid) }
    })

    const content = await fetchContent(transport as unknown as AtakTransport, baseUrl, undefined, { connectedOnly: true })

    expect(content.items.features.map(f => f.id)).toEqual(['ALPHA-1-1'])
    expect(transport.send).toHaveBeenCalledTimes(2)
  })

  it('uidOrCallsignContains filters devices by a case-insensitive substring match', async () => {
    transport.send.mockImplementation(async (req: AtakRequest): Promise<AtakResponse> => {
      if (req.path === '/Marti/api/clientEndPoints') {
        return clientEndpointsRes(['ALPHA-1-1', 'BRAVO-2-2'])
      }
      const uid = req.path.split('/').pop() as string
      return { status: 200, body: validCotXml(uid) }
    })

    const content = await fetchContent(transport as unknown as AtakTransport, baseUrl, undefined, { uidOrCallsignContains: 'alpha' })

    expect(content.items.features.map(f => f.id)).toEqual(['ALPHA-1-1'])
  })

  it('affiliations filters events by the 2nd segment of the CoT type code', async () => {
    transport.send.mockImplementation(async (req: AtakRequest): Promise<AtakResponse> => {
      if (req.path === '/Marti/api/clientEndPoints') {
        return clientEndpointsRes(['FRIEND-1', 'HOSTILE-1'])
      }
      const uid = req.path.split('/').pop() as string
      return { status: 200, body: validCotXml(uid, { type: uid === 'HOSTILE-1' ? 'a-h-G-U-C' : 'a-f-G-U-C' }) }
    })

    const content = await fetchContent(transport as unknown as AtakTransport, baseUrl, undefined, { affiliations: ['h'] })

    expect(content.items.features.map(f => f.id)).toEqual(['HOSTILE-1'])
  })

  it('startAfter/startBefore filter events outside the given CoT start-time range', async () => {
    transport.send.mockImplementation(async (req: AtakRequest): Promise<AtakResponse> => {
      if (req.path === '/Marti/api/clientEndPoints') {
        return clientEndpointsRes(['EARLY-1', 'IN-RANGE-1', 'LATE-1'])
      }
      const uid = req.path.split('/').pop() as string
      const start = uid === 'EARLY-1' ? '2026-05-11T06:00:00.000Z'
        : uid === 'LATE-1' ? '2026-05-11T12:00:00.000Z'
        : '2026-05-11T09:00:00.000Z'
      return { status: 200, body: validCotXml(uid, { start }) }
    })

    const content = await fetchContent(transport as unknown as AtakTransport, baseUrl, undefined, {
      startAfter: '2026-05-11T08:00:00.000Z',
      startBefore: '2026-05-11T10:00:00.000Z'
    })

    expect(content.items.features.map(f => f.id)).toEqual(['IN-RANGE-1'])
  })
})
