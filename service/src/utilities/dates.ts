import moment from 'moment'

export function parseISO8601(iso8601: unknown): Date | undefined {
  if (typeof iso8601 !== 'string') {
    return undefined
  }
  const date = moment(iso8601, moment.ISO_8601, true)
  return date.isValid() ? date.toDate() : undefined
}
