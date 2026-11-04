import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { User, UserRepository } from '@ngageoint/mage.service/lib/entities/users/entities.users'
import { UserLocation, UserLocationSavedDomainEvent } from '../entities/user-location'
import { buildLocationCotEventXml } from '../cot/build-location'
import { sendCotEvent } from '../transport.tcp'
import { TakPushSettingsRepository } from '../adapters/tak-push-settings.mongoose'
import { ResolvedTakSendTarget, TakSendTargetResolver } from './resolve-connection'

// Drives the MAGE user location -> TAK push feature, separate from
// TakPushController's observation track: real-time (one call per
// `UserLocationSavedDomainEvent`, no polling), its own per-event toggle
// (`locationSharingEnabled`), and no push-tracking store - there's nothing
// to re-sync, each location save is already the full current state to send.
// Shares the same TAK connection resolution as the observation track - where
// an event sends CoT isn't specific to what's being converted.
export class TakLocationPushController {

  constructor(
    private readonly resolveSendTarget: TakSendTargetResolver,
    private readonly settingsRepository: TakPushSettingsRepository,
    private readonly userRepository: UserRepository,
    private readonly log: Pick<Console, 'warn' | 'error'> = console,
    private readonly send: typeof sendCotEvent = sendCotEvent,
    private readonly buildLocationCot: typeof buildLocationCotEventXml = buildLocationCotEventXml
  ) { }

  // Registered directly as a core EventEmitter listener (see index.ts) - must
  // never reject, or an unhandled rejection in that listener call risks
  // taking down the whole server process (the same category of bug already
  // found and fixed in TakPushController's polling loop).
  async handleLocationsSaved(event: UserLocationSavedDomainEvent): Promise<void> {
    const userIds = [ ...new Set(event.locations.map(location => location.userId)) ]
    const usersById: Record<string, User | null> = await this.userRepository.findAllByIds(userIds).catch(err => {
      this.log.error('tak push: failed to look up users for location push', err)
      return {}
    })

    // Grouped by event so the per-event lookups below (sharing enabled?,
    // resolve the TAK connection) happen once per event in this batch, not
    // once per location - a batch can span multiple events' locations.
    const locationsByEvent = new Map<MageEventId, UserLocation[]>()
    for (const location of event.locations) {
      const locations = locationsByEvent.get(location.eventId) ?? []
      locations.push(location)
      locationsByEvent.set(location.eventId, locations)
    }

    for (const [ eventId, locations ] of locationsByEvent) {
      try {
        await this.pushEventLocations(eventId, locations, usersById)
      }
      catch (err) {
        this.log.error(`tak push: failed to push locations for event ${eventId}`, err)
      }
    }
  }

  private async pushEventLocations(eventId: MageEventId, locations: UserLocation[], usersById: Record<string, User | null>): Promise<void> {
    const locationSharingEnabled = await this.settingsRepository.isLocationSharingEnabled(eventId)
    if (!locationSharingEnabled) {
      return
    }
    const target = await this.resolveSendTarget(eventId)
    if (!target) {
      this.log.warn(`tak push: event ${eventId} has location sharing enabled but no TAK Server feed with a CoT port configured`)
      return
    }
    for (const location of locations) {
      try {
        await this.pushOneLocation(location, usersById[location.userId]?.displayName, target)
      }
      catch (err) {
        this.log.error(`tak push: failed to push location for user ${location.userId}`, err)
      }
    }
  }

  private async pushOneLocation(location: UserLocation, displayName: string | undefined, target: ResolvedTakSendTarget): Promise<void> {
    const callsign = displayName ?? location.userId
    const built = this.buildLocationCot(location, callsign, target.mageEvent.name)
    await this.send(target.host, target.port, built.xml)
  }
}
