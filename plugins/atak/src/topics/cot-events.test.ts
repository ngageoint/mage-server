import { createContentRequest, transformResponse, topicDescriptor } from './cot-events'
import { AtakRequest, AtakResponse } from '../atak'

const validCotXml = (uid: string) => `
<event uid="${uid}" type="a-f-G-U-C" time="2026-05-11T08:30:00.000Z" start="2026-05-11T08:30:00.000Z" stale="2026-05-11T08:31:00.000Z">
  <point lat="48.3794" lon="31.1656" hae="150.0" ce="10.0" le="5.0"/>
</event>
`

const req: AtakRequest = createContentRequest()

describe('cot-events transformResponse', () => {

  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('converts a response of a single valid CoT event string into a feature', () => {
    const res: AtakResponse = { status: 200, body: validCotXml('ALPHA-1-1') }

    const content = transformResponse(res, req)

    expect(content.topic).toBe(topicDescriptor.id)
    expect(content.items.features).toHaveLength(1)
    expect(content.items.features[0].id).toBe('ALPHA-1-1')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('skips an unparseable event and logs a warning', () => {
    const res: AtakResponse = { status: 200, body: '<event uid="broken"' }

    const content = transformResponse(res, req)

    expect(content.items.features).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('returns an empty FeatureCollection when the response body is not a string', () => {
    const res: AtakResponse = { status: 200, body: { unexpected: 'shape' } }

    const content = transformResponse(res, req)

    expect(content.items).toEqual({ type: 'FeatureCollection', features: [] })
  })

  it('returns an empty FeatureCollection for an empty string', () => {
    const res: AtakResponse = { status: 200, body: '' }

    const content = transformResponse(res, req)

    expect(content.items).toEqual({ type: 'FeatureCollection', features: [] })
  })
})
