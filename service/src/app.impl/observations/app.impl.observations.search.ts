import EventEmitter from 'events'
import { AppResponse } from '../../app.api/app.api.global'
import * as api from '../../app.api/observations/app.api.observations.search'
import { entityNotFound } from '../../app.api/app.api.errors'
import { Logger, NoopLogger } from '../../entities/entities.logging'
import { MageEventAttrs, MageEventRepository } from '../../entities/events/entities.events'
import { ObservationAttrs, ObservationDomainEventType, ObservationEmitted, ObservationRepositoryForEvent, ObservationSavedDomainEvent, ObservationSearchRepository } from '../../entities/observations/entities.observations'

export function IndexEventObservations(
  eventRepository: MageEventRepository,
  observationRepoForEvent: ObservationRepositoryForEvent,
  observationSearchRepo: ObservationSearchRepository,
  log: Logger = NoopLogger
): api.IndexEventObservations {
  return async function indexEventObservations(event: MageEventAttrs, force: boolean = false): Promise<void> {
    try {
      const claimed = await eventRepository.claimIndexing(event.id)
      if (!claimed) {
        log.debug(`skipping index for event ${event.id}, already running`)
        return
      }

      let observations: AsyncIterable<ObservationAttrs> & { close?: () => void } | null = null
      try {
        const observationRepo = await observationRepoForEvent(event.id)
        observations = observationRepo.iterate({})
        const count = await observationSearchRepo.populate(event.id, observations, force)
        log.debug(`indexed ${count} new observations for search for event ${event.id}`)
      } finally {
        observations?.close?.()
      }

      await eventRepository.update({ id: event.id, observationSearchStatus: 'indexed' })
    } catch (err) {
      log.error(`failed to index observations for search for event ${event.id}`, err)
      await eventRepository.update({ id: event.id, observationSearchStatus: 'pending' })
    }
  }
}

export async function indexAllEvents(
  eventRepository: MageEventRepository,
  indexEventObservations: api.IndexEventObservations,
  force: boolean = false
): Promise<void> {
  const events = await eventRepository.findAll()
  for (const event of events) {
    // Reset any stale 'running' status left by a previous crash so claimIndexing can proceed
    if (event.observationSearchStatus === 'running') {
      await eventRepository.update({ id: event.id, observationSearchStatus: 'pending' })
    }
    await indexEventObservations(event, force)
  }
}

export function SearchIndexAllEvents(
  permissionService: api.SearchIndexPermissionService,
  eventRepository: MageEventRepository,
  indexEventObservations: api.IndexEventObservations
): api.SearchIndexAllEvents {
  return async function searchIndexAllEvents(req: api.SearchIndexAllEventsRequest): ReturnType<api.SearchIndexAllEvents> {
    const denied = await permissionService.ensureSearchIndexAllPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }

    indexAllEvents(eventRepository, indexEventObservations, true)

    return AppResponse.success({})
  }
}

export function SearchIndexEvent(
  permissionService: api.SearchIndexPermissionService,
  eventRepository: MageEventRepository,
  indexEventObservations: api.IndexEventObservations
): api.SearchIndexEvent {
  return async function searchIndexEvent(req: api.SearchIndexEventRequest): ReturnType<api.SearchIndexEvent> {
    const denied = await permissionService.ensureSearchIndexEventPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }

    const event = await eventRepository.findById(req.eventId)
    if (!event) {
      return AppResponse.error(entityNotFound(req.eventId, 'Event'))
    }

    // Reset any stale 'running' status left by a previous crash so claimIndexing can proceed
    if (event.observationSearchStatus === 'running') {
      await eventRepository.update({ id: event.id, observationSearchStatus: 'pending' })
    }

    indexEventObservations(event, true)

    return AppResponse.success({})
  }
}

export function registerObservationSavedHandler(domainEvents: EventEmitter, repo: ObservationSearchRepository): void {
  domainEvents.on(ObservationDomainEventType.ObservationSaved, async (e: ObservationEmitted<ObservationSavedDomainEvent>) => {
    await repo.save(e.observation)
  })
}
