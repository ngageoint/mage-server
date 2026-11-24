import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'

export interface TakPushSettingsAttrs {
  eventId: MageEventId
  enabled: boolean
  enabledAt?: Date
  locationSharingEnabled: boolean
  // Independent of `enabled`, same reasoning as locationSharingEnabled - an
  // admin may want this configured before turning sharing back on. Defaults
  // off.
  deleteSyncEnabled: boolean
}

export interface TakPushSettingsRepository {
  isEnabled(eventId: MageEventId): Promise<boolean>
  setEnabled(eventId: MageEventId, enabled: boolean): Promise<TakPushSettingsAttrs>
  findAllEnabled(): Promise<TakPushSettingsAttrs[]>
  isLocationSharingEnabled(eventId: MageEventId): Promise<boolean>
  setLocationSharingEnabled(eventId: MageEventId, enabled: boolean): Promise<TakPushSettingsAttrs>
  isDeleteSyncEnabled(eventId: MageEventId): Promise<boolean>
  setDeleteSyncEnabled(eventId: MageEventId, enabled: boolean): Promise<TakPushSettingsAttrs>
}
