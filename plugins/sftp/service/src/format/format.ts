import { MageEvent } from "@ngageoint/mage.service/lib/entities/events/entities.events";
import { AttachmentStore, Observation } from "@ngageoint/mage.service/lib/entities/observations/entities.observations";
import { Archiver } from "archiver";
import { GeoJsonFormatter } from "./geojson";
import { UserRepository } from "@ngageoint/mage.service/lib/entities/users/entities.users";

export enum ArchiveFormat {
  GeoJSON = "GeoJSON"
}

export interface ObservationArchiver {
  createArchive(observation: Observation, event: MageEvent): Promise<Archiver>
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