import { MemberFilterSelection } from "../event/event-member-filter.component"
import { ObservationFieldFilter } from "../entities/observation/filter/entities.observation.filter"

export type FilterChoice = {
  filter: string | number
  label: string
}

function localUtcOffset(): string {
  const off = -new Date().getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const hour = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
  const minute = String(Math.abs(off) % 60).padStart(2, '0')
  return `${sign}${hour}:${minute}`
}

export const INTERVAL_CHOICES: FilterChoice[] = [
  { filter: 'all', label: 'All' },
  { filter: 'today', label: `Today (Local GMT ${localUtcOffset()})` },
  { filter: 86400, label: 'Last 24 Hours' },
  { filter: 43200, label: 'Last 12 Hours' },
  { filter: 21600, label: 'Last 6 Hours' },
  { filter: 3600, label: 'Last Hour' },
  { filter: 'custom', label: 'Custom' }
]

export type IntervalOptions = {
  endDate?: Date
  startDate?: Date
  localTime?: Boolean
}

export type Interval = {
  choice?: FilterChoice
  options?: IntervalOptions
}

export type EventObservationFilter = {
  timeInterval: Interval
  memberFilter?: MemberFilterSelection | null
  hasAttachments?: boolean
  isUserFavorite?: boolean
  isFlaggedImportant?: boolean
  fieldFilter?: ObservationFieldFilter | null
}

export type EventLocationFilter = {
  timeInterval: Interval
  memberFilter?: MemberFilterSelection | null
}

const DEFAULT_TIME_INTERVAL: Interval = {
  choice: INTERVAL_CHOICES[1]
}

export const DEFAULT_OBSERVATION_FILTER: EventObservationFilter = {
  timeInterval: DEFAULT_TIME_INTERVAL
}

export const DEFAULT_LOCATION_FILTER: EventLocationFilter = {
  timeInterval: DEFAULT_TIME_INTERVAL
}
