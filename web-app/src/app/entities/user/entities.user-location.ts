export type UserId = string

export type UserLocationProperties = {
  timestamp: string
  accuracy?: number
  [name: string]: unknown
}

export type UserLocation = GeoJSON.Feature<GeoJSON.Point, UserLocationProperties> & {
  id: UserId
  style?: { iconUrl: string }
}

export type UserWithLocation = {
  id: UserId
  userId: UserId
  user: {
    id: UserId
    displayName: string
    iconUrl?: string
    avatarUrl?: string
    lastUpdated?: string
  }
  location: UserLocation
}
