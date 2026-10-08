import { XMLParser } from 'fast-xml-parser'

/**
 * Cursor-on-Target (CoT) is a standard XML event schema shared across the
 * TAK ecosystem (ATAK, WinTAK, TAK Server/Marti, FreeTAKServer,
 * OpenTAKServer). This module only knows how to read that schema - it has
 * no knowledge of MAGE, feeds, or which server/transport a given XML
 * string came from.
 */
export interface CotPoint {
  lat: number
  lon: number
  hae: number
  ce: number
  le: number
}

export interface CotEvent {
  uid: string
  type: string
  time: string
  start: string
  stale: string
  point: CotPoint
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ''
})

/**
 * Parses a single CoT XML `<event>` document into a {@link CotEvent}.
 * Returns null if the XML can't be parsed, or any of the core fields this
 * plugin currently relies on are missing - callers should skip such events
 * rather than fail an entire batch over one malformed entry.
 */
export function parseCotEvent(xml: string): CotEvent | null {
  let parsed: any
  try {
    parsed = parser.parse(xml)
  }
  catch (err) {
    return null
  }

  const event = parsed?.event
  const point = event?.point
  if (!event || !point) {
    return null
  }

  const lat = Number(point.lat)
  const lon = Number(point.lon)
  const hae = Number(point.hae)
  const ce = Number(point.ce)
  const le = Number(point.le)
  if ([ lat, lon, hae, ce, le ].some(Number.isNaN)) {
    return null
  }

  const { uid, type, time, start, stale } = event
  if (!uid || !type || !time || !start || !stale) {
    return null
  }

  return {
    uid, type, time, start, stale,
    point: { lat, lon, hae, ce, le }
  }
}
