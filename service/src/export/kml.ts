'use strict';

const log = require('winston')
import async from 'async'
import archiver from 'archiver'
import stream from 'stream'
import path from 'path'
import { Exporter } from './exporter'
import * as writer from './kmlWriter'
import api from '../api'
import environment from '../environment/env'
import Icon, { IconDocument } from '../models/icon'
import User from '../models/user'
import { UserDocument } from '../adapters/users/adapters.users.db.mongoose'

const userBase = environment.userBaseDirectory;
const attachmentBase = environment.attachmentBaseDirectory;

export class Kml extends Exporter {

  export(streamable: NodeJS.WritableStream): void {
    // Known limitation in Google Earth, embedded media from a kmz file not render in a popup
    // Treating it as a zip, rather than a kmz.
    const archive = archiver('zip');
    archive.pipe(streamable);
    const kmlStream = new stream.PassThrough();
    archive.append(kmlStream, { name: 'mage-export.kml' });
    kmlStream.write(writer.generateKMLDocument());
    async.series(
      [
        (done): void => {
          if (!this._filter.exportObservations) {
            return done();
          }
          this.streamObservations(kmlStream, archive, done);
        },
        (done): void => {
          if (!this._filter.exportLocations) {
            return done();
          }
          this.streamLocations(kmlStream, archive, done);
        }
      ],
      err => {
        if (err) {
          log.warn(err);
        }
        kmlStream.write(writer.generateKMLDocumentClose());
        kmlStream.write(writer.generateKMLClose());
        kmlStream.end();
        archive.finalize();
      });
  }

  streamObservations (stream: stream.PassThrough, archive: archiver.Archiver, done: async.AsyncResultCallback<any>): void {
    log.info("Retrieving icons from DB for the event " + this._event.name);
    Icon.getAll({ eventId: this._event.id }, (err: any, icons?: IconDocument[]) => {
      if (err) {
        return done(err)
      }
      icons = icons || []
      log.info(`retrieved ${icons.length} icons`)
      stream.write(writer.generateObservationStyles(this.eventDoc, icons))
      stream.write(writer.generateKMLFolderStart(this._event.name))
      const cursor = this.requestObservations(this._filter)
      let numObservations = 0;
      cursor.eachAsync(observation => {
        stream.write(writer.generateObservationPlacemark(observation, this._event))
        if (observation.attachments) {
          observation.attachments.forEach(attachment => {
            if (attachment.relativePath) {
              archive.file(path.join(attachmentBase, attachment.relativePath), { name: attachment.relativePath })
            }
          })
        }
        numObservations++
      })
      .then(() => {
        if (cursor) {
          cursor.close
        }
        log.info('Successfully wrote ' + numObservations + ' observations to KML')
        stream.write(writer.generateKMLFolderClose())
        archive.directory(new api.Icon(this._event.id).getBasePath(), 'icons/' + this._event.id, { date: new Date() })
        done()
      })
      .catch(err => done(err))
    });
  }

  async streamLocations(stream: stream.PassThrough, archive: archiver.Archiver, done: async.AsyncResultCallback<any>): Promise<void> {
    log.info('Retrieving locations from DB');

    const { startDate, endDate } = this._filter
    const cursor = this.requestLocations({ startDate, endDate });
    let lastUserId: string | null = null;
    let lastUser: UserDocument | null = null;
    let userStyles = '';
    let numLocations = 0;
    let locationString = '';

    cursor.eachAsync(async location => {
      if (lastUserId !== location.userId.toString()) {
        if (lastUser) {
          //complete the previous user
          this.completeUserFolder(stream, archive, lastUser, locationString);
        }
        locationString = '';
        lastUserId = location.userId.toString();
        lastUser = await User.getUserById(location.userId);
        if (lastUser) {
          userStyles += writer.generateUserStyle(lastUser);
          stream.write(writer.generateKMLFolderStart(lastUser.displayName));
        }
      }
      if (lastUser) {
        locationString += writer.generateLocationPlacemark(lastUser, location);
      }
      numLocations++;
    })
    .then(() => {
      if (cursor) {
        cursor.close;
      }
      if (lastUser) {
        this.completeUserFolder(stream, archive, lastUser, locationString);
      }
      stream.write(userStyles);
      log.info(`wrote ${numLocations} locations to kml`);
      done();
    })
    .catch(err => done(err));
  }

  completeUserFolder(stream: stream.PassThrough, archive: archiver.Archiver, user: UserDocument, locationString: string): void {
    stream.write(locationString);
    if (user.icon && user.icon.relativePath) {
      archive.file(path.join(userBase, user.icon.relativePath), {
        name: 'icons/users/' + user._id.toString(),
        date: new Date()
      })
    }
    stream.write(writer.generateKMLFolderClose())
  }
}