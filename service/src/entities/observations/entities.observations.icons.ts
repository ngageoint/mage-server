import { MageEventId } from "../events/entities.events"
import { FormId } from "../events/entities.events.forms"

export type ObservationIconId = string

export type ObservationIcon = {
  eventId: MageEventId,
  formId: FormId,
  primary?: string,
  variant?: string,
  contentLocator: string
}

export interface ObservationIconRepository {
  getIcon(
    eventId: MageEventId,
    formId?: FormId | null,
    primary?: string | null,
    secondary?: string | null
  ): Promise<ObservationIcon | null>

  getIcons(eventId: MageEventId): Promise<ObservationIcon[]>
}

export interface ObservationIconContentStore {
  readContent(icon: ObservationIcon): Promise<NodeJS.ReadableStream | null | ObservationIconStoreError>
}

export class ObservationIconStoreError extends Error {
  constructor(readonly errorCode: ObservationIconStoreErrorCode, message?: string) {
    super(message)
    this.name = errorCode
  }
}

export enum ObservationIconStoreErrorCode {
  /**
   * The content for the given attachment ID was not found in the attachment
   * store.
   */
  ContentNotFound = 'ObservationIconStoreError.ContentNotFound',
  /**
   * The underlying storage system, e.g. file system, raised an error during
   * some I/O operation.
   */
  StorageError = 'ObservationIconStoreError.StorageError'
}
