import fs from 'fs'
import path from 'path'
import util from 'util'
import uniqid from 'uniqid'
import { AttachmentId, AttachmentStore, AttachmentStoreError, AttachmentStoreErrorCode, Observation, PendingAttachmentContent, PendingAttachmentContentId } from '../../entities/observations/entities.observations'

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

  async saveContent(content: PendingAttachmentContentId | NodeJS.ReadableStream, attachmentId: string, observation: Observation): Promise<AttachmentStoreError | null> {
    if (typeof content === 'string') {
      const tempPath = path.join(this.pendingDirPath, content)
      const saveRelPath = relativePathOfAttachment(attachmentId, observation)
      if (saveRelPath instanceof AttachmentStoreError) {
        return saveRelPath
      }
      const savePath = path.resolve(this.baseDirPath, saveRelPath)
      const saveDirPath = path.dirname(savePath)
      const mkdir = util.promisify(fs.mkdir)
      const move = util.promisify(fs.rename)
      return mkdir(saveDirPath, { recursive: true })
        .then(_ => move(tempPath, savePath))
        .then(_ => null, err => {
          const message = `error moving staged content ${tempPath} to ${savePath}`
          console.error(message, err)
          return new AttachmentStoreError(AttachmentStoreErrorCode.StorageError, message)
        })
    }
    throw new Error('Method not implemented.')
  }

  saveThumbnailContent(content: unknown, minDimension: number, attachmentId: string, observation: Observation): Promise<AttachmentStoreError | null> {
    throw new Error('Method not implemented.')
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
}

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

export class FileSystemAttachmentStoreInitError extends Error {

}

export function relativePathOfAttachment(attachmentId: AttachmentId, observation: Observation): string | AttachmentStoreError {
  const attachment = observation.attachmentFor(attachmentId)
  if (!attachment) {
    return AttachmentStoreError.invalidAttachmentId(attachmentId, observation)
  }
  const extName = path.extname(attachment.name || '')
  const created = observation.createdAt
  const savePath = path.join(
    `event-${observation.eventId}`,
    String(created.getUTCFullYear()),
    String(created.getUTCMonth() + 1),
    String(created.getUTCDate()),
    observation.id,
    attachment.id)
  return savePath + extName
}

const FileSystemAttachmentStoreConstructorToken = Symbol('FileSystemAttachmentStoreConstructorToken')