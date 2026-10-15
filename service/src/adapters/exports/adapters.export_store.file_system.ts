import { open, stat, unlink } from 'fs/promises'
import { createWriteStream, Stats } from 'fs'
import path from 'path'
import { Export, ExportContent, ExportStore, ExportStoreError, ExportStoreErrorCode } from '../../entities/exports/entities.exports'

export class FileSystemExportContentStore implements ExportStore {
  constructor(readonly baseDirPath: string) {}

  writeContent(exp: Export): ExportContent {
    const relativePath = relativeWritePath(exp)
    const contentPath = path.join(this.baseDirPath, relativePath)
    const content = createWriteStream(contentPath)
    return { relativePath, content }
  }

  async readContent(exp: Export): Promise<NodeJS.ReadableStream | null | ExportStoreError> {
    const relativePath = relativeWritePath(exp)
    const contentPath = path.join(this.baseDirPath, relativePath)

    try {
      const fileHandle = await open(contentPath, 'r')
      return fileHandle.createReadStream()
    } catch (err) {
      const errno = err as NodeJS.ErrnoException
      const code = errno && errno.code === 'ENOENT' ? ExportStoreErrorCode.ContentNotFound : ExportStoreErrorCode.StorageError
      return new ExportStoreError(code, `error reading export ${exp.id}`)
    }
  }

  async contentStats(exp: Export): Promise<Stats | ExportStoreError> {
    const relativePath = relativeWritePath(exp)
    const contentPath = path.join(this.baseDirPath, relativePath)

    try {
      return await stat(contentPath)
    } catch( err) {
      const errno = err as NodeJS.ErrnoException
      const code = errno && errno.code === 'ENOENT' ? ExportStoreErrorCode.ContentNotFound : ExportStoreErrorCode.StorageError
      return new ExportStoreError(code, `error deleting export ${exp.id}`)
    }
  }

  async deleteContent(exp: Export): Promise<void | ExportStoreError> {
    const relativePath = relativeWritePath(exp)
    const contentPath = path.join(this.baseDirPath, relativePath)

    try {
      await unlink(contentPath)
    } catch( err) {
      const errno = err as NodeJS.ErrnoException
      const code = errno && errno.code === 'ENOENT' ? ExportStoreErrorCode.ContentNotFound : ExportStoreErrorCode.StorageError
      return new ExportStoreError(code, `error deleting export ${exp.id}`)
    }
  }
}

function relativeWritePath(exp: Export): string {
  return `${exp.id}-${exp.exportType}.zip`
}
