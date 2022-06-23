import fs, { createWriteStream } from 'fs'
import path from 'path'
import stream from 'stream'
import util from 'util'
import uniqid from 'uniqid'
import { Attachment, AttachmentStore, AttachmentStoreError, AttachmentStoreErrorCode, copyThumbnailAttrs, Observation, patchAttachment, PendingAttachmentContent, PendingAttachmentContentId, putAttachmentThumbnailForMinDimension, Thumbnail } from '../../entities/observations/entities.observations'

export class FileSystemAttachmentStore implements AttachmentStore {

  constructor(token: symbol, readonly baseDirPath: string, readonly pendingDirPath: string) {
    if (token !== FileSystemAttachmentStoreConstructorToken) {
      throw new FileSystemAttachmentStoreInitError('use the factory function')
    }
  }

  async stagePendingContent(): Promise<PendingAttachmentContent> {
    const id = uniqid()
    const tempPath = path.join(this.pendingDirPath, id)
    const tempLocation = fs.createWriteStream(tempPath)
    return Object.freeze({ id, tempLocation })
  }

  async saveContent(content: PendingAttachmentContentId | NodeJS.ReadableStream, attachmentId: string, observation: Observation): Promise<AttachmentStoreError | Observation | null> {
    const attachment = observation.attachmentFor(attachmentId)
    if (!attachment) {
      return AttachmentStoreError.invalidAttachmentId(attachmentId, observation)
    }
    const saveRelPath = relativeWritePathForAttachment(attachment, observation)
    const savePath = path.join(this.baseDirPath, saveRelPath)
    const err = await this.#saveContent(content, savePath)
    if (err) {
      return err
    }
    if (attachment.contentLocator) {
      return null
    }
    return patchAttachment(observation, attachmentId, { contentLocator: saveRelPath }) as Observation
  }

  async saveThumbnailContent(content: unknown, minDimension: number, attachmentId: string, observation: Observation): Promise<AttachmentStoreError | Observation | null> {
    const attachment = observation.attachmentFor(attachmentId)
    if (!attachment) {
      return AttachmentStoreError.invalidAttachmentId(attachmentId, observation)
    }
    const thumbnailPos = attachment.thumbnails.findIndex(x => x.minDimension === minDimension)
    const thumbnail = attachment.thumbnails[thumbnailPos]
    if (!thumbnail) {
      return AttachmentStoreError.invalidThumbnailDimension(minDimension, attachmentId, observation)
    }
    const saveRelPath = relativeWritePathForThumbnail(thumbnail, attachment, observation)
    const savePath = path.join(this.baseDirPath, saveRelPath)
    const err = await this.#saveContent(content, savePath)
    if (err) {
      return err
    }
    if (thumbnail.contentLocator) {
      return null
    }
    const savedThumbnail = copyThumbnailAttrs(thumbnail)
    savedThumbnail.contentLocator = saveRelPath
    return putAttachmentThumbnailForMinDimension(observation, attachmentId, savedThumbnail) as Observation
  }

  async readContent(attachmentId: string, observation: Observation, range: { start: number, end?: number } = { start: 0 }): Promise<NodeJS.ReadableStream | AttachmentStoreError> {
    const attachment = observation.attachmentFor(attachmentId)
    if (!attachment) {
      return Promise.resolve(AttachmentStoreError.invalidAttachmentId(attachmentId, observation))
    }
    const contentRelPath = relativeReadPathForAttachment(attachment, observation)
    const contentPath = path.join(this.baseDirPath, contentRelPath)
    return fs.createReadStream(contentPath, range)
  }

  async readThumbnailContent(minDimension: number, attachmentId: string, observation: Observation): Promise<NodeJS.ReadableStream | AttachmentStoreError> {
    const attachment = observation.attachmentFor(attachmentId)
    if (!attachment) {
      return Promise.resolve(AttachmentStoreError.invalidAttachmentId(attachmentId, observation))
    }
    const thumbnail = attachment.thumbnails.find(x => x.minDimension === minDimension)
    if (!thumbnail) {
      return Promise.resolve(AttachmentStoreError.invalidThumbnailDimension(minDimension, attachmentId, observation))
    }
    const contentRelPath = relativeReadPathForThumbnail(thumbnail, attachment, observation)
    const contentPath = path.join(this.baseDirPath, contentRelPath)
    return fs.createReadStream(contentPath)
  }

  async deleteContent(attachmentId: string, observation: Observation): Promise<AttachmentStoreError | Observation | null> {
    const attachment = observation.attachmentFor(attachmentId)
    if (!attachment) {
      return AttachmentStoreError.invalidAttachmentId(attachmentId, observation)
    }
    const thumbnails = attachment.thumbnails
    const contentRelPath = relativeReadPathForAttachment(attachment, observation)
    const contentPath = path.join(this.baseDirPath, contentRelPath)
    const rm = async (path: string) => {
      if (!this.#baseDirIsAncestorOf(path)) {
        throw new Error(`cannot remove path ${path} because it is not a descendant of store base dir ${this.baseDirPath}`)
      }
      return await util.promisify(fs.rm)(path)
    }
    const err = await rm(contentPath).then(() => null, err => err)
    if (err) {
      const message = `error deleting content for attachment ${attachmentId} on observation ${observation.id}`
      console.error(message, err)
      return new AttachmentStoreError(AttachmentStoreErrorCode.StorageError, `${message}: ${String(err)}`)
    }
    const thumbRemoves = await Promise.all(thumbnails.map(thumb => {
      const thumbRelPath = relativeReadPathForThumbnail(thumb, attachment, observation)
      const thumbPath = path.join(this.baseDirPath, thumbRelPath)
      return rm(thumbPath).then(
        () => ({ thumb, success: true }),
        err => {
          console.error(`error deleting thumbnail ${thumb.minDimension} for attachment ${attachmentId} on observation ${observation.id} @ ${thumbPath}`, err)
          return { thumb, success: false }
        })
    }))
    const thumbUpdate = thumbRemoves.reduce((thumbUpdate, thumbRemove) => {
      const { success, thumb } = thumbRemove
      if (success && thumb.contentLocator) {
        const updatedThumb = { ...copyThumbnailAttrs(thumb), contentLocator: undefined }
        thumbUpdate = { isNecessary: true, thumbnails: thumbUpdate.thumbnails.concat(updatedThumb) }
      }
      else {
        thumbUpdate = { isNecessary: thumbUpdate.isNecessary, thumbnails: thumbUpdate.thumbnails.concat(thumb) }
      }
      return thumbUpdate
    }, { isNecessary: false, thumbnails: [] as Thumbnail[] })
    if (attachment.contentLocator || thumbUpdate.isNecessary) {
      return patchAttachment(observation, attachmentId, { contentLocator: undefined, thumbnails: thumbUpdate.thumbnails }) as Observation
    }
    return null
  }

  #saveContent(content: PendingAttachmentContentId | NodeJS.ReadableStream, dest: string): Promise<AttachmentStoreError | null> {
    const destResolved = path.resolve(dest)
    if (!this.#baseDirIsAncestorOf(destResolved)) {
      return Promise.resolve(new AttachmentStoreError(AttachmentStoreErrorCode.StorageError, `content destination ${dest} is not a descendent of base dir ${this.baseDirPath}`))
    }
    const destBaseDirPath = path.dirname(destResolved)
    const mkdir: (() => Promise<void>) = () => util.promisify(fs.mkdir)(destBaseDirPath, { recursive: true }).then(_ => void(0))
    if (typeof content === 'string') {
      const move = util.promisify(fs.rename)
      const tempPath = path.join(this.pendingDirPath, content)
      return mkdir()
        .then(_ => move(tempPath, dest))
        .then(_ => null, err => {
          const message = `error moving staged content ${tempPath} to ${dest}`
          console.error(message, err)
          return new AttachmentStoreError(AttachmentStoreErrorCode.StorageError, message)
        })
    }
    const source = content as NodeJS.ReadableStream
    const pipe = util.promisify(stream.pipeline)
    return mkdir()
      .then(_ => createWriteStream(dest))
      .then(dest => pipe(source, dest))
      .then(_ => null, err => {
        const message = `error saving source stream to path ${dest}`
        console.error(message, err)
        return new AttachmentStoreError(AttachmentStoreErrorCode.StorageError, message)
      })
  }

  #baseDirIsAncestorOf(testPath: string): boolean {
    return path.relative(testPath, this.baseDirPath).split(path.sep).every(x => x === '..')
  }
}

/**
 * Create the directories for an attachment store at the given path if they
 * do not exist.  Return a file system attachment store that stores content
 * under the given base directory.  Return an error if there was an error
 * creating the required directories.
 * @param baseDirPath
 * @returns {@link FileSystemAttachmentStore} or {@link FileSystemAttachmentStoreInitError}
 */
export async function intializeAttachmentStore(baseDirPath: string): Promise<FileSystemAttachmentStore | FileSystemAttachmentStoreInitError> {
  const mkdir = util.promisify(fs.mkdir)
  baseDirPath = path.resolve(baseDirPath)
  const pendingDirPath = path.resolve(baseDirPath, 'pending')
  await mkdir(pendingDirPath, { recursive: true }).catch(err => {
    console.error(`error creating attachment store base direcgtory ${baseDirPath}:`, err)
    return new FileSystemAttachmentStoreInitError(`error creating attachment store base direcgtory ${baseDirPath}: ${String(err)}`)
  })
  return new FileSystemAttachmentStore(FileSystemAttachmentStoreConstructorToken, baseDirPath, pendingDirPath)
}

export class FileSystemAttachmentStoreInitError extends Error {}

/**
 * Return a path relative to the store's base directory suitable to write the
 * file for the given attachment's main content bytes.  If the attachment has
 * a {@link Attachment.contentLocator contentLocator}, simply return that as
 * the relative path.  Otherwise, construct a relative path based on the
 * property values of the attachment and its parent observation.
 * @returns `string`
 */
function relativeWritePathForAttachment(attachment: Attachment, observation: Observation): string {
  if (attachment.contentLocator) {
    return attachment.contentLocator
  }
  const created = observation.createdAt
  const baseDirPath = path.join(
    `event-${observation.eventId}`,
    String(created.getUTCFullYear()),
    String(created.getUTCMonth() + 1).padStart(2, '0'),
    String(created.getUTCDate()).padStart(2, '0'),
    observation.id,
    attachment.id)
  return baseDirPath
}

/**
 * If the attachment has a non-empty {@link Attachment.contentLocator | `contentLocator`},
 * return that.  Otherwise, return the presumed path based on the observation
 * and attachment attributes.
 */
function relativeReadPathForAttachment(attachment: Attachment, observation: Observation): string {
  if (attachment.contentLocator) {
    return attachment.contentLocator
  }
  return relativeWritePathForAttachment(attachment, observation)
}

function relativeWritePathForThumbnail(thumbnail: Thumbnail, attachment: Attachment, observation: Observation): string {
  if (thumbnail.contentLocator) {
    return thumbnail.contentLocator
  }
  const basePath = relativeWritePathForAttachment(attachment, observation)
  return `${basePath}-${thumbnail.minDimension}`
}

function relativeReadPathForThumbnail(thumbnail: Thumbnail, attachment: Attachment, observation: Observation): string {
  if (thumbnail.contentLocator) {
    return thumbnail.contentLocator
  }
  return relativeWritePathForThumbnail(thumbnail, attachment, observation)
}

const FileSystemAttachmentStoreConstructorToken = Symbol('FileSystemAttachmentStoreConstructorToken')