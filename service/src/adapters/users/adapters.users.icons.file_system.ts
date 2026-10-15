import path from 'path'
import { open } from 'fs/promises'
import { User, UserIconContentStore, UserIconStoreError, UserIconStoreErrorCode } from '../../entities/users/entities.users'

export class FileSystemUserIconContentStore implements UserIconContentStore {
  constructor(readonly baseDirPath: string) {}

  async readContent(user: User): Promise<NodeJS.ReadableStream | null | UserIconStoreError> {
    const relativePath = path.join(user.id, 'icon')
    const contentPath = path.join(this.baseDirPath, relativePath)

    try {
      const fileHandle = await open(contentPath, 'r')
      return fileHandle.createReadStream()
    } catch (err) {
      const errno = err as NodeJS.ErrnoException
      if (errno.code === 'ENOENT') {
        return null
      }

      return new UserIconStoreError(UserIconStoreErrorCode.StorageError, `error reading observation icon ${relativePath}`)
    }
  }
}
