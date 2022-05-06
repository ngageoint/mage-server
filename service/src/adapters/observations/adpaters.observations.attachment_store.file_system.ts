import fs, { createWriteStream } from 'fs'
import path from 'path'
import stream from 'stream'
import util from 'util'
import uniqid from 'uniqid'
import { Attachment, AttachmentId, AttachmentStore, AttachmentStoreError, AttachmentStoreErrorCode, Observation, PendingAttachmentContent, PendingAttachmentContentId } from '../../entities/observations/entities.observations'

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

  saveContent(content: PendingAttachmentContentId | NodeJS.ReadableStream, attachmentId: string, observation: Observation): Promise<AttachmentStoreError | null> {
    const saveRelPath = relativePathForAttachment(attachmentId, observation)
    if (saveRelPath instanceof AttachmentStoreError) {
      return Promise.resolve(saveRelPath)
    }
    const savePath = path.resolve(this.baseDirPath, saveRelPath)
    return this.#saveContent(content, savePath)
  }

  saveThumbnailContent(content: unknown, minDimension: number, attachmentId: string, observation: Observation): Promise<AttachmentStoreError | null> {
    const saveRelPath = relativePathForThumbnail(minDimension, attachmentId, observation)
    if (saveRelPath instanceof AttachmentStoreError) {
      return Promise.resolve(saveRelPath)
    }
    const savePath = path.resolve(this.baseDirPath, saveRelPath)
    return this.#saveContent(content, savePath)
  }

  readContent(attachmentId: string, observation: Observation): Promise<NodeJS.ReadableStream | AttachmentStoreError> {
    throw new Error('Method not implemented.')
  }

  readThumbnailContent(minDimension: number, attachmentId: string, observation: Observation): Promise<NodeJS.ReadableStream | AttachmentStoreError> {
    throw new Error('Method not implemented.')
  }

  deleteContent(attachmentId: string, observation: Observation): Promise<AttachmentStoreError | null> {
    throw new Error('Method not implemented.')
  }

  deleteThumbnailContent(minDimension: number, attachmentId: string, observation: Observation): Promise<AttachmentStoreError | null> {
    throw new Error('Method not implemented.')
  }

  #saveContent(content: PendingAttachmentContentId | NodeJS.ReadableStream, dest: string): Promise<AttachmentStoreError | null> {
    const destBaseDirPath = path.dirname(dest)
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

export function relativePathForAttachment(attachmentId: AttachmentId, observation: Observation): string | AttachmentStoreError {
  return relativeBasePathForAttachment(attachmentId, observation)
}

export function relativePathForThumbnail(size: number, attachmentId: AttachmentId, observation: Observation): string | AttachmentStoreError {
  const basePath = relativeBasePathForAttachment(attachmentId, observation)
  if (basePath instanceof AttachmentStoreError) {
    return basePath
  }
  return `${basePath}-${size}`
}

function relativeBasePathForAttachment(attachmentId: AttachmentId, observation: Observation): string | AttachmentStoreError {
  const attachment = observation.attachmentFor(attachmentId)
  if (!attachment) {
    return AttachmentStoreError.invalidAttachmentId(attachmentId, observation)
  }
  const created = observation.createdAt
  const baseDirPath = path.join(
    `event-${observation.eventId}`,
    String(created.getUTCFullYear()),
    String(created.getUTCMonth() + 1),
    String(created.getUTCDate()),
    observation.id,
    attachmentId)
  return baseDirPath
}

const FileSystemAttachmentStoreConstructorToken = Symbol('FileSystemAttachmentStoreConstructorToken')