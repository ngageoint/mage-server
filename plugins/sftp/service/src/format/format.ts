import { MageEvent } from "@ngageoint/mage.service/lib/entities/events/entities.events";
import { AttachmentId, AttachmentStore, Observation, ObservationId } from "@ngageoint/mage.service/lib/entities/observations/entities.observations";
import { Archiver } from "archiver";
import { GeoJsonFormatter } from "./geojson";
import { UserRepository } from "@ngageoint/mage.service/lib/entities/users/entities.users";

export enum ArchiveFormat {
  GeoJSON = "GeoJSON"
}

export enum CompletionAction {
  None = "None",
  Archive = "Archive"
}

export enum TriggerRule {
  Create = "Create",
  CreateAndUpdate = "CreateAndUpdate"
}

export enum ArchiveErrorCode {
  /**
   * The content for the attachment ID was not found in the attachment store.
   */
  AttachmentNotFound = 'ArchiveErrorCode.AttachmentNotFound',
}

export class ArchiveError extends Error {

  static attachmentNotFound(attachmentId: AttachmentId, observationId: ObservationId): ArchiveError {
    return new ArchiveError(ArchiveErrorCode.AttachmentNotFound, `attachment ${attachmentId} on observation ${observationId} does not exist in file store.`)
  }

  constructor(readonly errorCode: ArchiveErrorCode, message?: string) {
    super(message)
    this.name = errorCode
  }
}

export interface ObservationArchiver {
  createArchive(observation: Observation, event: MageEvent): Promise<Archiver | ArchiveError>
}

export class ArchiverFactory {
  private format: ArchiveFormat
  private userRepository: UserRepository
  private attachmentStore: AttachmentStore

  constructor(
    format: ArchiveFormat,
    userRepository: UserRepository,
    attachmentStore: AttachmentStore
  ) {
    this.format = format
    this.userRepository = userRepository
    this.attachmentStore = attachmentStore
  }

  createArchiver(): ObservationArchiver {
    if (this.format === ArchiveFormat.GeoJSON) {
      return new GeoJsonFormatter(this.userRepository, this.attachmentStore)
    } else {
      throw new Error('Unsupported Archive Format')
    }
  }
}