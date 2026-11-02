import { parseCotEvent } from './parse'

const sampleCotEventXml = `
<event version="2.0" uid="ALPHA-1-1" type="a-f-G-U-C" how="m-g" time="2026-05-11T08:30:00.000Z" start="2026-05-11T08:30:00.000Z" stale="2026-05-11T08:31:00.000Z">
  <point lat="48.3794" lon="31.1656" hae="150.0" ce="10.0" le="5.0"/>
  <detail>
    <contact callsign="ALPHA-1-1"/>
    <group name="Cyan" role="Team Member"/>
    <status battery="85"/>
    <track speed="0.0" course="270.0"/>
  </detail>
</event>
`

describe('parseCotEvent', () => {

  it('parses the core fields from a real CoT event', () => {
    const result = parseCotEvent(sampleCotEventXml)
    expect(result).toEqual({
      uid: 'ALPHA-1-1',
      type: 'a-f-G-U-C',
      time: '2026-05-11T08:30:00.000Z',
      start: '2026-05-11T08:30:00.000Z',
      stale: '2026-05-11T08:31:00.000Z',
      point: { lat: 48.3794, lon: 31.1656, hae: 150.0, ce: 10.0, le: 5.0 }
    })
  })

  it('returns null for malformed xml', () => {
    expect(parseCotEvent('<event uid="broken"')).toBeNull()
  })

  it('returns null when point is missing', () => {
    expect(parseCotEvent('<event uid="x" type="x" time="x" start="x" stale="x"></event>')).toBeNull()
  })

  it('returns null when a core event attribute is missing', () => {
    const xml = `<event uid="x" type="x" time="x" start="x"><point lat="1" lon="2" hae="3" ce="4" le="5"/></event>`
    expect(parseCotEvent(xml)).toBeNull()
  })

  it('returns null when a point coordinate is not numeric', () => {
    const xml = `<event uid="x" type="x" time="x" start="x" stale="x"><point lat="not-a-number" lon="2" hae="3" ce="4" le="5"/></event>`
    expect(parseCotEvent(xml)).toBeNull()
  })
})
