'use strict';

import api from '../api'
import async from 'async'
import archiver from 'archiver'
import moment from 'moment'
import stream from 'stream'
import path from 'path'
import turfCentroid from '@turf/centroid'
import { AllGeoJSON } from '@turf/helpers'
import { Exporter } from './exporter'
import { attachmentBaseDirectory as attachmentBase } from '../environment/env'
import User, { UserDocument } from '../models/user'
import Device from '../models/device'
import { AttachmentDocument, ObservationDocument, ObservationDocumentFormEntry } from '../models/observation'
import { FormFieldType } from '../entities/events/entities.events.forms'
const mgrs = require('mgrs')

const logger = require('../logger')
const log = [ 'debug', 'info', 'warn', 'error', 'log' ].reduce((log: any, methodName: string): any => {
  const logMethod = logger[methodName] as (...args: any[]) => any
  return {
    ...log,
    [methodName]: (...args: any[]) => logMethod('[export:geojson]', ...args)
  }
}, {} as any)

export class GeoJson extends Exporter {

  export(streamable: NodeJS.WritableStream): void {
    const archive = archiver('zip');
    archive.pipe(streamable);
    async.parallel(
      [
        (done): void => {
          if (!this._filter.exportObservations) {
            return done();
          }
          const observationStream = new stream.PassThrough();
          archive.append(observationStream, { name: 'observations.geojson' });
          this.streamObservations(observationStream, archive, err => {
            observationStream.end();
            done(err);
          });
        },
        (done): void => {
          if (!this._filter.exportLocations) return done();

          const locationStream = new stream.PassThrough();
          archive.append(locationStream, { name: 'locations.geojson' });
          this.streamLocations(locationStream, (err: any) => {
            locationStream.end();
            done(err);
          });
        }
      ],
      err => {
        if (err) {
          log.warn(err);
        }
        archive.finalize();
      }
    );
  }

  mapObservationProperties(observation: ObservationDocument, archive: archiver.Archiver): void {
    const centroid = turfCentroid(observation as AllGeoJSON)
    const exportProperties = {
      ...observation.properties,
      id: observation._id,
      timestamp: moment(observation.properties.timestamp).toISOString(),
      mgrs: mgrs.forward(centroid.geometry.coordinates),
    } as any
    delete exportProperties.forms
    const formEntries = observation.properties?.forms || [] as ObservationDocumentFormEntry[]
    const { formEntriesByName, exportAttachments } = formEntries.reduce(({ formEntriesByName, exportAttachments }, formEntry) => {
      const form = this._event.formFor(formEntry.formId)
      if (!form) {
        return { formEntriesByName, exportAttachments }
      }
      const { fieldEntryHash, entryAttachments } = form.fields.reduce(({ fieldEntryHash, entryAttachments }, field) => {
        if (field.archived || field.type === FormFieldType.Password || field.type === FormFieldType.Geometry ||
          (field.type === FormFieldType.CheckBox && field.value === null)) {
          return { fieldEntryHash, entryAttachments }
        }
        if (field.type === FormFieldType.Attachment) {
          const fieldAttachments = observation.attachments.filter(attachment => {
            return attachment.relativePath &&
              attachment.fieldName === field.name &&
              String(attachment.observationFormId) === String(formEntry._id)
            }
          )
          const attachmentRelPaths = fieldAttachments.map(x => x.relativePath)
          fieldEntryHash[field.name] = attachmentRelPaths
          entryAttachments = entryAttachments.concat(fieldAttachments)
        }
        else if (formEntry[field.name] !== undefined) {
          fieldEntryHash[field.name] = formEntry[field.name]
        }
        return { fieldEntryHash, entryAttachments }
      }, { fieldEntryHash: {} as any, entryAttachments: [] as AttachmentDocument[] })
      const entriesForForm = formEntriesByName[form.name] || []
      entriesForForm.push(fieldEntryHash)
      formEntriesByName[form.name] = entriesForForm
      exportAttachments = exportAttachments.concat(entryAttachments)
      return { formEntriesByName, exportAttachments }
    }, { formEntriesByName: {} as any, exportAttachments: [] as AttachmentDocument[] })

    exportAttachments.forEach(x => archive.file(path.join(attachmentBase, x.relativePath!), { name: x.relativePath! }))

    observation.properties = { ...exportProperties, ...formEntriesByName }
  }

  async streamObservations(stream: NodeJS.WritableStream, archive: archiver.Archiver, done: (err?: any) => void): Promise<void> {
    log.info('fetching observations');
    const cursor = this.requestObservations(this._filter);
    let user: UserDocument | null = null;
    let device: any = null;
    let numObservations = 0;

    stream.write('{"type": "FeatureCollection", "features": [');
    cursor.eachAsync(async observation => {
      if (numObservations > 0) {
        stream.write(',');
      }

      this.mapObservationProperties(observation, archive);

      if (observation.userId) {
        if (!user || user._id.toString() !== String(observation.userId)) {
          user = await User.getUserById(observation.userId)
        }
      }
      if (observation.deviceId) {
        if (!device || device._id.toString() !== String(observation.deviceId)) {
          device = await Device.getDeviceById(observation.deviceId)
        }
      }
      const exportProperties = observation.properties as any
      if (user) {
        exportProperties.user = user.username;
      }
      if (device) {
        exportProperties.device = device.uid;
      }
      const data = JSON.stringify({
        geometry: observation.geometry,
        properties: observation.properties
      });
      stream.write(data);
      numObservations++;
    })
    .then(() => {
      if (cursor) {
        cursor.close()
      }
      stream.write(']}');
      // throw in icons
      archive.directory(new api.Icon(this._event.id).getBasePath(), 'mage-export/icons', { date: new Date() });
      log.info(`wrote ${numObservations} observations`);
      done();
    })
    .catch(err => done(err));
  }

  streamLocations(stream: NodeJS.WritableStream, done: (err?: any) => void): void {
    log.info('fetching locations');
    const { startDate, endDate } = this._filter
    const cursor = this.requestLocations({ startDate: startDate, endDate: endDate });
    let numLocations = 0;
    stream.write('{"type": "FeatureCollection", "features": [');
    cursor.eachAsync(location => {
      if (numLocations > 0) {
        stream.write(',');
      }
      const centroid = turfCentroid(location);
      const exportProperties = location.properties as any
      exportProperties.mgrs = mgrs.forward(centroid.geometry.coordinates);
      const data = JSON.stringify(location);
      stream.write(data);
      numLocations++;
    })
    .then(() => {
      if (cursor) {
        cursor.close();
      }
      stream.write(']}');
      log.info(`wrote ${numLocations} locations`);
      done();
    })
    .catch(err => done(err));
  }
}
