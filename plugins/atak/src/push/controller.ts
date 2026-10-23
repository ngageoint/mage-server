import { MageEvent, MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { Observation, ObservationAttrs, ObservationRepositoryForEvent } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import { buildCotEventXml } from '../cot/build'
import { sendCotEvent } from '../transport.tcp'
import { AtakPushRepository } from '../adapters/atak-push.mongoose'
import { AtakPushSettingsRepository } from '../adapters/atak-push-settings.mongoose'
import { TakSendTargetResolver } from './resolve-connection'

export const PAGE_SIZE = 1000
const DEFAULT_POLL_INTERVAL_MS = 30_000
const RECENT_SYNC_LIMIT = 5

export interface RecentlySyncedObservation {
  observationId: string
  callsign: string
  syncedAt: Date
}

export interface AtakPushStatus {
  enabled: boolean
  locationSharingEnabled: boolean
  connectionConfigured: boolean
  pushedCount: number
  lastSyncedAt: Date | null
  recentlySynced: RecentlySyncedObservation[]
}

// Drives the MAGE observation -> TAK push feature for events that have
// sharing enabled. `pushEventObservations` is the one real operation -
// everything else is a thin read of the settings/tracking stores.
export class AtakPushController {

  private isRunning = false
  private nextTimeout: NodeJS.Timeout | undefined

  constructor(
    private readonly resolveSendTarget: TakSendTargetResolver,
    private readonly observationRepositoryForEvent: ObservationRepositoryForEvent,
    private readonly settingsRepository: AtakPushSettingsRepository,
    private readonly trackingRepository: AtakPushRepository,
    private readonly log: Pick<Console, 'warn' | 'error'> = console,
    private readonly send: typeof sendCotEvent = sendCotEvent,
    private readonly buildCot: typeof buildCotEventXml = buildCotEventXml
  ) { }

  // Starts the self-rescheduling polling loop: on each tick, push every
  // event with sharing enabled, then schedule the next tick. Mirrors
  // `SftpController.start()`/`stop()`/`scheduleNext()`'s shape
  async start(intervalMs: number = DEFAULT_POLL_INTERVAL_MS): Promise<void> {
    this.isRunning = true
    await this.pollAndScheduleNext(intervalMs)
  }

  stop(): void {
    this.isRunning = false
    clearTimeout(this.nextTimeout)
  }

  private async pollAndScheduleNext(intervalMs: number): Promise<void> {
    // Guards the whole tick, not just each event's push - a failure to even
    // list enabled events (e.g. a transient DB hiccup) must still reschedule
    // the next tick rather than reject, since this chain starts from
    // `start()`, which index.ts calls without awaiting or catching.
    try {
      await this.pollOnce()
    }
    catch (err) {
      this.log.error('atak push: poll tick failed', err)
    }
    this.scheduleNext(intervalMs)
  }

  private scheduleNext(intervalMs: number): void {
    if (this.isRunning) {
      this.nextTimeout = setTimeout(() => this.pollAndScheduleNext(intervalMs), intervalMs)
    }
  }

  private async pollOnce(): Promise<void> {
    const enabledSettings = await this.settingsRepository.findAllEnabled()
    for (const { eventId } of enabledSettings) {
      try {
        await this.pushEventObservations(eventId)
      }
      catch (err) {
        this.log.error(`atak push: failed polling event ${eventId}`, err)
      }
    }
  }

  async isEnabled(eventId: MageEventId): Promise<boolean> {
    return this.settingsRepository.isEnabled(eventId)
  }

  async setEnabled(eventId: MageEventId, enabled: boolean): Promise<void> {
    await this.settingsRepository.setEnabled(eventId, enabled)
  }

  async isLocationSharingEnabled(eventId: MageEventId): Promise<boolean> {
    return this.settingsRepository.isLocationSharingEnabled(eventId)
  }

  async setLocationSharingEnabled(eventId: MageEventId, enabled: boolean): Promise<void> {
    await this.settingsRepository.setLocationSharingEnabled(eventId, enabled)
  }

  async pushEventObservations(eventId: MageEventId): Promise<void> {
    const target = await this.resolveSendTarget(eventId)
    if (!target) {
      this.log.warn(`atak push: event ${eventId} has sharing enabled but no TAK Server feed with a CoT port configured`)
      return
    }
    const { mageEvent, host, port: cotPort } = target
    const observationRepository = await this.observationRepositoryForEvent(eventId)
    // Known v1 limitation, not an oversight: scans every observation in the
    // event on every tick (timestamp 0 = since the epoch), relying on
    // pushOneObservation's lastSyncedAt check to skip unchanged ones. Correct,
    // but wasteful once an event has been running a while. A per-event "last
    // successful poll time" would let the repository itself return only
    // what changed - deliberately not done here, since it adds new state and
    // requires deciding what happens to that timestamp when a tick fails
    // partway through, which is more than this pass's scope.
    let pageIndex = 0
    let pageItemCount: number
    do {
      const page = await observationRepository.findLastModifiedAfter(0, { pageSize: PAGE_SIZE, pageIndex })
      for (const attrs of page.items) {
        await this.pushOneObservation(eventId, attrs, mageEvent, host, cotPort)
      }
      pageItemCount = page.items.length
      pageIndex++
    } while (pageItemCount === PAGE_SIZE)
  }

  async findPushStatusForEvent(eventId: MageEventId): Promise<AtakPushStatus> {
    const [ enabled, locationSharingEnabled, target, tracked, recent ] = await Promise.all([
      this.settingsRepository.isEnabled(eventId),
      this.settingsRepository.isLocationSharingEnabled(eventId),
      this.resolveSendTarget(eventId),
      this.trackingRepository.findAllForEvent(eventId),
      this.trackingRepository.findRecentForEvent(eventId, RECENT_SYNC_LIMIT)
    ])
    const lastSyncedAt = tracked.reduce<Date | null>(
      (latest, x) => !latest || x.lastSyncedAt > latest ? x.lastSyncedAt : latest,
      null
    )
    return {
      enabled,
      locationSharingEnabled,
      connectionConfigured: !!target,
      pushedCount: tracked.length,
      lastSyncedAt,
      recentlySynced: recent.map(x => ({ observationId: x.observationId, callsign: x.callsign, syncedAt: x.lastSyncedAt }))
    }
  }

  private async pushOneObservation(
    eventId: MageEventId,
    attrs: ObservationAttrs,
    mageEvent: MageEvent,
    host: string,
    port: number
  ): Promise<void> {
    try {
      const tracked = await this.trackingRepository.findByObservation(eventId, attrs.id)
      if (tracked && tracked.lastSyncedAt >= attrs.lastModified) {
        return
      }
      // buildCotEventXml only ever reads id/geometry/formEntries/mageEvent.formFor,
      // so a plain adapter over the raw attrs is enough - no need for the
      // full Observation.evaluate() validation machinery just to get CoT XML
      // out of this.
      const observation = {
        id: attrs.id,
        geometry: attrs.geometry,
        formEntries: attrs.properties.forms,
        mageEvent: { formFor: (formId: number) => mageEvent.formFor(formId) }
      } as unknown as Observation
      const built = this.buildCot(observation, mageEvent.name)
      if (!built) {
        return
      }
      await this.send(host, port, built.xml)
      await this.trackingRepository.recordPush(eventId, attrs.id, built.uid, new Date(), built.callsign)
    }
    catch (err) {
      this.log.error(`atak push: failed to push observation ${attrs.id} for event ${eventId}`, err)
    }
  }
}
