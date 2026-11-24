import { buildDeleteCotEventXml } from './build-delete'
import { parseCotEvent } from './parse'

describe('buildDeleteCotEventXml', () => {

  it('reuses the given uid rather than deriving one', () => {
    const xml = buildDeleteCotEventXml('MAGE-obs-42', 'b-m-p-s-m')
    const event = parseCotEvent(xml)
    expect(event?.uid).toBe('MAGE-obs-42')
  })

  it('sets the type to the TAK-standard delete directive, not the original marker type', () => {
    const xml = buildDeleteCotEventXml('MAGE-obs-42', 'b-m-p-s-m')
    const event = parseCotEvent(xml)
    expect(event?.type).toBe('t-x-d-d')
  })

  it('references the removed uid and its original type via a <link> element', () => {
    const xml = buildDeleteCotEventXml('MAGE-obs-42', 'b-m-p-s-m')
    expect(xml).toContain('<link relation="p-p" uid="MAGE-obs-42" type="b-m-p-s-m">')
  })

  it('sets stale 10 minutes after start, not equal to it', () => {
    const xml = buildDeleteCotEventXml('MAGE-obs-42', 'b-m-p-s-m')
    const event = parseCotEvent(xml)
    const start = new Date(event!.start).getTime()
    const stale = new Date(event!.stale).getTime()
    expect(stale - start).toBe(10 * 60 * 1000)
  })
})
