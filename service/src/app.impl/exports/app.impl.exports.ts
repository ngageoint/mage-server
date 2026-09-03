import * as api from '../../app.api/exports/app.api.exports'
import { AppResponse, KnownErrorsOf, withPermission } from '../../app.api/app.api.global'
import {
  Export,
  ExportExpanded,
  ExportProjection,
  ExportsRepository,
  ExportStatus,
  ExportStore,
  ExportStoreError
} from '../../entities/exports/entities.exports'
import { FindObservationsStreamSpec, FormEntry, ObservationAttrs, ObservationId, ObservationRepositoryForEvent, ObservationSearchRepository } from '../../entities/observations/entities.observations'
import { entityNotFound, infrastructureError, invalidInput, InvalidInputError } from '../../app.api/app.api.errors'
import { TeamRepository } from '../../entities/teams/entities.teams'
import { resolveUserIsAnyOf } from '../teams/app.impl.teams'
import { FormId } from '../../entities/events/entities.events.forms'
import { Stats } from 'fs'
import archiver from 'archiver'
import { once } from 'stream'
import { Logger, NoopLogger } from '../../entities/entities.logging'
import { MageEvent } from '../../entities/events/entities.events'

export function FetchExports(repository: ExportsRepository, permissionService: api.ExportAppLayerPermissionService): api.GetExports {
  return async function getExports(req: api.GetExportsRequest): ReturnType<api.GetExports> {
    return await withPermission<ExportExpanded[], KnownErrorsOf<api.GetExports>>(
      permissionService.ensureGetMyExportPermission(req.context),
      async () => {
        const user = req.context.requestingPrincipal()
        return await repository.getExportsForUser(user.id)
      }
    )
  }
}

export function GetExportContent(
  repository: ExportsRepository,
  contentStore: ExportStore,
  permissionService: api.ExportAppLayerPermissionService
): api.GetExportContent {
  return async function readExportContent(req: api.GetExportContentRequest): ReturnType<api.GetExportContent> {
    const denied = await permissionService.ensureGetMyExportContentPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }

    const user = req.context.requestingPrincipal()
    const exp = await repository.getExportForUser(req.exportId, user.id)
    if (!exp) {
      return AppResponse.error(entityNotFound(req.exportId, 'Export'))
    }

    let contentStream: NodeJS.ReadableStream | null | ExportStoreError = null
    contentStream = await contentStore.readContent(exp)
    if (!contentStream) {
      return AppResponse.error(entityNotFound(req.exportId, 'Export content'))
    }
    if (contentStream instanceof ExportStoreError) {
      return AppResponse.error(infrastructureError(contentStream.message))
    }

    return AppResponse.success({
      export: exp,
      bytes: contentStream
    })
  }
}

export function CreateExport(
  exportFactory: api.ExportFactory,
  exportsRepository: ExportsRepository,
  contentStore: ExportStore,
  permissionService: api.ExportAppLayerPermissionService,
  teamRepository: TeamRepository,
  log: Logger = NoopLogger
): api.CreateExport {
  return async function createExport(req: api.CreateExportRequest): ReturnType<api.CreateExport> {
    return await withPermission<Export, KnownErrorsOf<api.CreateExport>>(
      permissionService.ensureCreateExportPermission(req.context),
      async (): Promise<Export | InvalidInputError> => {
        const user = req.context.requestingPrincipal()
        const { context, format, filter } = req
        const newExport = await exportsRepository.createExport({
          userId: user.id,
          eventId: context.mageEvent.id,
          ...req
        })

        const exporter = exportFactory(format)

        if (!exporter) {
          return invalidInput('invalid export type', [ `invalid export type: ${format}`, 'type' ])
        }

        const { content, relativePath } = contentStore.writeContent(newExport)

        const patch = {
          status: ExportStatus.Running,
          relativePath: relativePath
        }
        await exportsRepository.updateExportForUser(newExport.id, user.id, patch)

        const exportParams: api.ExportParams = {}
        if (filter?.observations) {
          const observations = filter.observations
          const observationUserIsAnyOf = await resolveUserIsAnyOf(teamRepository, observations.userIsAnyOf, observations.teamIsAnyOf)
          exportParams.observationParams = {
            findSpec: {
              where: {
                stateIsAnyOf: [ 'active' ],
                timestampAfter: observations.startDate,
                timestampBefore: observations.endDate,
                isFavoriteOfUser: observations.favorites ? user.id : undefined,
                isFlaggedImportant: observations.important,
                userIsAnyOf: observationUserIsAnyOf,
                hasAttachments: observations.hasAttachments,
                fieldFilter: observations.fieldFilter
              },
              includeAttachments: observations.includeAttachments
            },
            fieldProjection: {
              includesForm: (formId: FormId) => projectionIncludesForm(formId, observations.projection),
              includesField: (formId: FormId, fieldName: string) => projectionIncludesField(formId, fieldName, observations.projection),
              formEntries: (observation) => projectedObservationFormFields(observation, observations.projection)
            }
          }
        }

        if (filter?.locations) {
          const locations = filter.locations
          const locationUserIsAnyOf = await resolveUserIsAnyOf(teamRepository, locations.userIsAnyOf, locations.teamIsAnyOf)
          exportParams.locationParams = {
            findSpec: {
              where: {
                eventId: context.mageEvent.id,
                timestampAfter: locations.startDate,
                timestampBefore: locations.endDate,
                userIsAnyOf: locationUserIsAnyOf
              }
            }
          }
        }

        const archive = archiver('zip')
        archive.pipe(content)
        exporter.export(context.mageEvent, archive, exportParams).then(async result => {
          const streamClosed = once(content, 'close')
          await archive.finalize()
          await streamClosed
          const stats = await contentStore.contentStats(newExport)
          const update = {
            status: ExportStatus.Completed,
            size: stats instanceof Stats ? stats.size : undefined,
            summary: {
              observations: { ...result.observations},
              locations: { ...result.locations }
            }
          }
          await exportsRepository.updateExportForUser(newExport.id, user.id, update)
        }).catch(async (err) => {
          log.error('Export error', err)
          await contentStore.deleteContent(newExport)
          await exportsRepository.updateExportForUser(newExport.id, user.id, { status: ExportStatus.Failed })
          archive.abort()
        })

        return { ...newExport, ...patch }
      }
    )
  }
}

export function DeleteExport(
  repository: ExportsRepository,
  contentStore: ExportStore,
  permissionService: api.ExportAppLayerPermissionService
): api.DeleteExport {
  return async function getExports(req: api.DeleteExportRequest): ReturnType<api.DeleteExport> {
    return await withPermission<Export, KnownErrorsOf<api.DeleteExport>>(
      permissionService.ensureDeleteMyExportPermission(req.context),
      async () => {
        const user = req.context.requestingPrincipal()
        const exp = await repository.deleteExportForUser(req.exportId, user.id)
        if (exp === null) {
          return entityNotFound(req.exportId, 'Export')
        }

        await contentStore.deleteContent(exp)

        return exp
      }
    )
  }
}

export interface IterateObservations {
  (event: MageEvent, spec: FindObservationsStreamSpec): Promise<AsyncIterable<ObservationAttrs> & { close?: () => void }>
}

export function IterateObservations(
  obsRepoFactory: ObservationRepositoryForEvent,
  searchRepo: ObservationSearchRepository
): IterateObservations {
  return async function findStream(event: MageEvent, findSpec: FindObservationsStreamSpec): Promise<AsyncIterable<ObservationAttrs> & { close?: () => void }> {
    let ids: ObservationId[] | undefined = undefined
    if (findSpec.where?.fieldFilter) {
      ids = await searchRepo.findIdsByFilter(findSpec.where?.fieldFilter, event)
    }

    const observationRepository = await obsRepoFactory(event.id)
    return observationRepository.iterate({ ...findSpec, where: { ...findSpec.where, ids } })
  }
}

function projectionForForm(formId: FormId, projection: ExportProjection) {
  return projection.find(formProjection => formProjection.formId === formId)
}

function projectionIncludesForm(formId: FormId, projection?: ExportProjection): boolean {
  if (!projection) return true
  return projectionForForm(formId, projection) !== undefined
}

function projectionIncludesField(formId: FormId, fieldName: string, projection?: ExportProjection): boolean {
  if (!projection) return true
  const formProjection = projectionForForm(formId, projection)
  return formProjection?.fields.some(fieldProjection => fieldProjection === fieldName) ?? false
}

function projectedObservationFormFields(observation: ObservationAttrs, projection?: ExportProjection): FormEntry[] {
  if (!projection) {
    return Array.from(observation.properties.forms)
  }

  return observation.properties.forms.filter(formEntry => {
    return projection.some(formProjection => formEntry.formId === formProjection.formId)
  }).map(formEntry => {
    const formProjection = projection.find(formProjection => formEntry.formId === formProjection.formId)
    const projectedProperties: any = Object.fromEntries(
      Object.entries(formEntry).filter(([key]) => formProjection?.fields.includes(key))
    )

    return {
      ...projectedProperties,
      id: formEntry.id,
      formId: formEntry.formId,
    } as FormEntry
  })
}
