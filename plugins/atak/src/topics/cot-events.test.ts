import { URL } from 'url'
import { fetchContent, topicDescriptor } from './cot-events'
import { AtakRequest, AtakResponse, AtakTransport } from '../atak'

const validCotXml = (uid: string) => `
<event uid="${uid}" type="a-f-G-U-C" time="2026-05-11T08:30:00.000Z" start="2026-05-11T08:30:00.000Z" stale="2026-05-11T08:31:00.000Z">
  <point lat="48.3794" lon="31.1656" hae="150.0" ce="10.0" le="5.0"/>
</event>
`

const baseUrl = new URL('http://test.tak')

const clientEndpointsRes = (uids: string[]): AtakResponse => ({
  status: 200,
  body: { data: uids.map(uid => ({ uid, callsign: uid, lastStatus: 'Connected' })) } as any
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

  it('returns an empty FeatureCollection when clientEndPoints responds with an unexpected shape', async () => {
    transport.send.mockResolvedValueOnce({ status: 200, body: { unexpected: 'shape' } as any })

    const content = await fetchContent(transport as unknown as AtakTransport, baseUrl, undefined)

    expect(content.items).toEqual({ type: 'FeatureCollection', features: [] })
  })
})
