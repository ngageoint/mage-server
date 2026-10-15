import path from 'path'
import { open } from 'fs/promises'
import { ObservationIcon, ObservationIconContentStore, ObservationIconStoreError, ObservationIconStoreErrorCode } from '../../entities/observations/entities.observations.icons'

export class FileSystemObservationIconContentStore implements ObservationIconContentStore {
  constructor(readonly baseDirPath: string) {}

  async readContent(icon: ObservationIcon): Promise<NodeJS.ReadableStream | null | ObservationIconStoreError> {
    const contentPath = path.join(this.baseDirPath, icon.contentLocator)

    try {
      const fileHandle = await open(contentPath, 'r')
      return fileHandle.createReadStream()
    } catch (err) {
      const errno = err as NodeJS.ErrnoException
      const code = errno && errno.code === 'ENOENT' ? ObservationIconStoreErrorCode.ContentNotFound : ObservationIconStoreErrorCode.StorageError
      return new ObservationIconStoreError(code, `error reading observation icon ${icon.contentLocator}`)
    }
  }
}
