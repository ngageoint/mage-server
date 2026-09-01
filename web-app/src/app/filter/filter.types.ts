import { User } from "@ngageoint/mage.web-core-lib/user"
import { filterChanges } from "../event/event.types"
import { Event, Form } from "../entities/event/entities.event"
import { Team } from "../entities/team/entities.team"

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

export type SearchInterval = {
    start: string
    end: string
}

export type Interval = {
  choice?: FilterChoice
  options?: IntervalOptions
}

export type Filter = {
  event?: Event
  teams?: Team[]
  users?: User[]
  forms?: Form[]
  intervalChoice?: FilterChoice
  timeInterval?: Interval
  actionFilter?: string
}

export type Changes = {
  event?: filterChanges
  teams?: filterChanges
  users?: filterChanges
  forms?: filterChanges
  timeInterval?: Interval
  actionFilter?: string
  intervalChoice?: FilterChoice
}
