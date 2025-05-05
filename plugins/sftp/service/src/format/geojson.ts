import { MageEvent } from "@ngageoint/mage.service/lib/entities/events/entities.events";
import { Form, FormField, FormFieldType, FormId } from "@ngageoint/mage.service/lib/entities/events/entities.events.forms";
import { Attachment, AttachmentStore, FormEntry, FormFieldEntry, FormFieldEntryItem, Observation } from "@ngageoint/mage.service/lib/entities/observations/entities.observations";
import archiver, { Archiver } from "archiver";
import { Feature } from "geojson";
import { ObservationArchiver, ArchiveError, ArchiveResult } from "./entities.format";
import { ReadStream } from "fs";
import { User, UserRepository } from "@ngageoint/mage.service/lib/entities/users/entities.users";
import { Readable } from 'node:stream';

export class GeoJsonFormatter implements ObservationArchiver {
  private userRepository: UserRepository
  private attachmentStore: AttachmentStore

  constructor(userRepository: UserRepository, attachmentStore: AttachmentStore) {
    this.userRepository = userRepository
    this.attachmentStore = attachmentStore
  }

  async createArchive(observation: Observation, event: MageEvent): Promise<ArchiveResult | ArchiveError> {
    try {
      const archive: Archiver = archiver('zip')
      const geojson = await this.createObservationGeoJSON(observation, event)
      archive.append(JSON.stringify(geojson), { name: 'observation.geojson' })

      for (const attachment of observation.attachments) {
        const stream = await this.attachmentStore.readContent(attachment.id, Observation.evaluate(observation, new MageEvent(event)))
        if (stream instanceof ReadStream) {
          archive.append(Readable.from(stream), { name: this.getAttachmentPath(attachment) });
        } else {
          return ArchiveResult.incomplete(archive)
        }
      }

      return ArchiveResult.complete(archive)
    } catch (e) {
      return ArchiveError.error(e, observation.id)
    }
  }

  private async createObservationGeoJSON(observation: Observation, event: MageEvent): Promise<Feature> {
    var formDefinitions: Map<FormId, Form> = new Map(event.forms.map(form => [form.id, form]));

    const forms: Array<{
      title: string | undefined,
      fields: { [formFieldName: string]: FormFieldEntry }
    }> = []

    observation.properties.forms.forEach((observationForm: FormEntry) => {
      const formDefinition = formDefinitions.get(observationForm.formId)

      const fields: { [formFieldName: string]: FormFieldEntry } = {}
      formDefinition?.fields?.forEach((fieldDefinition: FormField) => {
        if (fieldDefinition.type === FormFieldType.Attachment) {
          const attachments: Array<FormFieldEntryItem> = observation.attachments.filter((attachment: Attachment) => {
            return attachment.fieldName === fieldDefinition.name && attachment.observationFormId === observationForm.id
          }).map((attachment: Attachment) => {
            return this.getAttachmentPath(attachment)
          })

          fields[fieldDefinition.title] = attachments
        } else {
          const fieldValue = observationForm[fieldDefinition.name]
          if (fieldValue !== undefined) {
            fields[fieldDefinition.title] = fieldValue
          }
        }
      })

      forms.push({
        title: formDefinition?.name,
        fields
      })
    })

    let user: User | null = null
    if (observation.userId) {
      user = await this.userRepository.findById(observation.userId)
    }

    const geojson: Feature = {
      type: "Feature",
      geometry: observation.geometry,
      properties: {
        timestamp: observation.properties.timestamp,
        user: {
          id: user?.id,
          name: user?.displayName
        },
        event: {
          id: event.id,
          name: event.name,
          description: event.description
        },
        forms,
      }
    }

    return geojson
  }

  private getAttachmentPath(attachment: Attachment): string {
    const filename = attachment.name || `${attachment.id}}`
    return `media/${attachment.id}/${filename}`
  }
}

