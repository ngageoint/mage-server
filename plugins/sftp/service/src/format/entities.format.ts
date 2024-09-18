import { MageEvent } from "@ngageoint/mage.service/lib/entities/events/entities.events";
import { AttachmentStore, Observation, ObservationId } from "@ngageoint/mage.service/lib/entities/observations/entities.observations";
import { Archiver, ArchiverError } from "archiver";
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

export enum ArchiveStatus {
  Complete = 'ArchiveStatus.Complete',
  Incomplete = 'ArchiveStatus.Incomplete'
}

export class ArchiveResult {
  static complete(archive: Archiver): ArchiveResult {
    return new ArchiveResult(archive, ArchiveStatus.Complete)
  }

  static incomplete(archive: Archiver): ArchiveResult {
    return new ArchiveResult(archive, ArchiveStatus.Incomplete)
  }

  constructor(readonly archive: Archiver, readonly status: ArchiveStatus) {
    this.archive = archive
    this.status = status
  }
}

export class ArchiveError extends Error {

  static error(error: Error | any, observationId: ObservationId): ArchiveError {
    const errorCode = (error instanceof ArchiverError) ? error.code : 'undefined'
    return new ArchiveError(errorCode, `Failed to create SFTP archive for on observation ${observationId}`)
  }

  constructor(readonly errorCode: string, message?: string) {
    super(message)
    this.errorCode = errorCode
  }
}

export interface ObservationArchiver {
  createArchive(observation: Observation, event: MageEvent): Promise<ArchiveResult | ArchiveError>
}

export class ArchiverFactory {
  private userRepository: UserRepository
  private attachmentStore: AttachmentStore

  constructor(
    userRepository: UserRepository,
    attachmentStore: AttachmentStore
  ) {
    this.userRepository = userRepository
    this.attachmentStore = attachmentStore
  }

  createArchiver(format: ArchiveFormat): ObservationArchiver {
    if (format === ArchiveFormat.GeoJSON) {
      return new GeoJsonFormatter(this.userRepository, this.attachmentStore)
    } else {
      throw new Error('Unsupported Archive Format')
    }
  }
}