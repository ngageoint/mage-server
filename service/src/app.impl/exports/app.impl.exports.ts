import * as api from '../../app.api/exports/app.api.exports'
import { AppResponse, KnownErrorsOf, withPermission } from '../../app.api/app.api.global'
import { Export, ExportProjection, ExportsRepository, ExportStatus, ExportStore, ExportStoreError } from '../../entities/exports/entities.exports'
import { FormEntry, ObservationAttrs } from '../../entities/observations/entities.observations'
import { entityNotFound, infrastructureError, invalidInput, InvalidInputError } from '../../app.api/app.api.errors'
import { Stats } from 'fs'
import archiver from 'archiver'
import { once } from 'stream'
import { Logger, NoopLogger } from '../../entities/entities.logging'

export function FetchExports(repository: ExportsRepository, permissionService: api.ExportAppLayerPermissionService): api.GetExports {
  return async function getExports(req: api.GetExportsRequest): ReturnType<api.GetExports> {
    return await withPermission<Export[], KnownErrorsOf<api.GetExports>>(
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
  log: Logger = NoopLogger
): api.CreateExport {
  return async function getExports(req: api.CreateExportRequest): ReturnType<api.CreateExport> {
    return await withPermission<Export, KnownErrorsOf<api.CreateExport>>( 
      permissionService.ensureCreateExportPermission(req.context),
      async (): Promise<Export | InvalidInputError> => {
        const user = req.context.requestingPrincipal()
        const newExport = await exportsRepository.createExport({
          userId: user.id,
          eventId: req.context.mageEvent.id,
          ...req
        })

        const exporter = exportFactory(req.format)

        if (!exporter) {
          return invalidInput('invalid export type', [ `invalid export type: ${req.format}`, 'type' ])
        }

        const { content, relativePath } = contentStore.writeContent(newExport)

        const patch = {
          status: ExportStatus.Running,
          relativePath: relativePath
        }
        await exportsRepository.updateExportForUser(newExport.id, user.id, patch)

        const archive = archiver('zip')
        archive.pipe(content)
        exporter.export(req.context.mageEvent, {
          filter: {
            ...req.filter,
            favorites: req.filter.favorites ? { userId: user.id } : false
          },
          projection: req.projection
        }, projectedObservationFormFields, archive).then(async result => {
          const streamClosed = once(content, 'close')
          archive.finalize()
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
          
          exportsRepository.updateExportForUser(newExport.id, user.id, update)
        }).catch(async (err) => {
          log.error('Export error', err)
          await contentStore.deleteContent(newExport)
          exportsRepository.updateExportForUser(newExport.id, user.id, { status: ExportStatus.Failed })
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