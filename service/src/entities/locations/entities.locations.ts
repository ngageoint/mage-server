import { Feature, Point } from 'geojson'
import { MageEventId } from '../events/entities.events'
import { TeamId } from '../teams/entities.teams'
import { UserId } from '../users/entities.users'

export type LocationID = string

export interface UserLocation extends Feature<Point, UserLocationProperties> {
  userId: UserId
  eventId: MageEventId
  /**
   * TODO: this comes from the mongoose model but nothing seems to reference
   * this in the server or web app. check mobile clients as well. maybe this
   * can be removed.
   */
  teamIds: TeamId[]
}

export interface UserLocationProperties {
  timestamp: Date
  deviceId?: string | null
  /**
   * Provider is the source that generated the location, e.g., `gps` for a
   * mobile phone's GPS.  This is device-dependent.
   */
  provider?: string
  altitude?: number
  accuracy?: number
  speed?: number,
  bearing?: number,
  battery_level?: number,
}