import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'

export interface TakPushSettingsAttrs {
  eventId: MageEventId
  enabled: boolean
  enabledAt?: Date
  locationSharingEnabled: boolean
}

export interface TakPushSettingsRepository {
  isEnabled(eventId: MageEventId): Promise<boolean>
  setEnabled(eventId: MageEventId, enabled: boolean): Promise<TakPushSettingsAttrs>
  findAllEnabled(): Promise<TakPushSettingsAttrs[]>
  isLocationSharingEnabled(eventId: MageEventId): Promise<boolean>
  setLocationSharingEnabled(eventId: MageEventId, enabled: boolean): Promise<TakPushSettingsAttrs>
}
