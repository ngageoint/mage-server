import { createContentRequest, transformResponse, topicDescriptor } from './cot-events.opentak'
import { AtakRequest, AtakResponse } from '../atak'

const validCotXml = (uid: string) => `
<event uid="${uid}" type="a-f-G-U-C" time="2026-05-11T08:30:00.000Z" start="2026-05-11T08:30:00.000Z" stale="2026-05-11T08:31:00.000Z">
  <point lat="48.3794" lon="31.1656" hae="150.0" ce="10.0" le="5.0"/>
</event>
`

const req: AtakRequest = createContentRequest()

describe('cot-events.opentak', () => {

  it('builds the OpenTAKServer native-API content request', () => {
    expect(req).toEqual({ method: 'get', path: '/api/cot' })
  })

  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('converts a response of valid CoT event strings into features', () => {
    const res: AtakResponse = { status: 200, body: [ validCotXml('ALPHA-1-1'), validCotXml('ALPHA-1-2') ] }

    const content = transformResponse(res, req)

    expect(content.topic).toBe(topicDescriptor.id)
    expect(content.items.features).toHaveLength(2)
    expect(content.items.features[0].id).toBe('ALPHA-1-1')
    expect(content.items.features[1].id).toBe('ALPHA-1-2')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('returns an empty FeatureCollection when the response body is not an array', () => {
    const res: AtakResponse = { status: 200, body: { unexpected: 'shape' } }

    const content = transformResponse(res, req)

    expect(content.items).toEqual({ type: 'FeatureCollection', features: [] })
  })
})
