import { makeCotEventsTopic } from './cot-events.shared'

/**
 * UNCONFIRMED - not yet verified against a real running OpenTAKServer
 * instance. OpenTAKServer's own docs describe GET /api/cot with query
 * params (how, type, sender_callsign, sender_uid, page, per_page), which
 * suggests a paginated JSON response rather than Marti's flat
 * array-of-CoT-XML-strings shape. This reuses the same parsing as the Marti
 * topic module as a starting point; it will likely need a real
 * transformResponse once we can inspect an actual response body.
 */
const topic = makeCotEventsTopic({
  id: 'cot-events',
  title: 'OpenTAK CoT Events',
  summary: 'Live Cursor-on-Target events (unit positions, points of interest) from a connected OpenTAKServer instance.',
  path: '/api/cot'
})

export const topicDescriptor = topic.topicDescriptor
export const createContentRequest = topic.createContentRequest
export const transformResponse = topic.transformResponse
