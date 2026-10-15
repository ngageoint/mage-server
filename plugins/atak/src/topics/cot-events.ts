import { makeCotEventsTopic } from './cot-events.shared'

/**
 * Marti's docs list this endpoint's response as `application/json`, an
 * array of strings, with no sample body or further schema. Working theory,
 * unconfirmed: each string is a serialized CoT XML <event> document. Since
 * that shape is still unverified against a real server, a response that
 * isn't an array of strings is treated as "no items" rather than thrown as
 * an error - same resilience convention nws-alerts uses for an
 * unreachable/misbehaving source.
 */
const topic = makeCotEventsTopic({
  id: 'cot-events',
  title: 'ATAK CoT Events',
  summary: 'Live Cursor-on-Target events (unit positions, points of interest) from a connected ATAK/TAK server.',
  path: '/Marti/api/cot'
})

export const topicDescriptor = topic.topicDescriptor
export const createContentRequest = topic.createContentRequest
export const transformResponse = topic.transformResponse
