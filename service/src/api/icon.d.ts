import { MageEventId } from '../entities/events/entities.events'
import { FormId } from '../entities/events/entities.events.forms'
import { IconDocument } from '../models/icon'


type Callback<T> = (err: any | null | undefined, result?: T) => any

declare namespace Icon {
    export interface IconDocumentResolved extends IconDocument {
    /**
     * The absolute path of the icon file, i.e., the icon base dir path prepended
     * to this icon's relative path
     */
    path: string
  }
}

declare class Icon {
  constructor(eventId?: MageEventId | null, formId?: FormId | null | 'null', primary?: string | null | 'null', variant?: string | null | 'null')
  /**
   * Return the path of the base directory that stores all icons for the MAGE
   * server instance.
   */
  getBasePath(): string
  writeZip(path: string, callback: Callback<void>): void
  getZipPath(callback: Callback<string>): void
  getIcons(callback: Callback<Icon.IconDocumentResolved[]>): void
  getIcon(callback: Callback<Icon.IconDocumentResolved>): void
  /**
   * Copy the MAGE global default icon file to the default icon directory for
   * this icon's event and form.
   */
  saveDefaultIconToEventForm(callback: Callback<Icon.IconDocumentResolved>): void
  /**
   * Create new icon record, copying the given source file to the proper path
   * based on the the event, form, primary, and secondary values of this icon
   * instance.
   */
  create(from: { originalname: string, path: string }, callback: Callback<IconDocument>): void
  /**
   * Create new icon record using the given name, e.g. `marker.png`, and this
   * icon instance's event and form properties.
   */
  add(from: { name: string }, callback: Callback<IconDocument>): void
  /**
   * Delete the icon record and file this icon instance's properties reference.
   * This calls the given callback after removing the database record, then
   * asynchonously deletes the icon file.
   */
  delete(callback: Callback<void>): void
}

export = Icon
