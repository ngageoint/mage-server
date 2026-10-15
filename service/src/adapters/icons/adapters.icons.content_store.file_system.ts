import { StaticIcon, StaticIconContentStore, StaticIconStoreError, StaticIconStoreErrorCode } from '../../entities/icons/entities.icons'
import { writeFile, open, mkdir } from 'fs/promises'
import path from 'path'

export class FileSystemIconContentStore implements StaticIconContentStore {
  constructor(readonly baseDirPath: string) {}

  async putContent(icon: StaticIcon, content: NodeJS.ReadableStream): Promise<void | StaticIconStoreError> {
    const relativePath = relativeWritePathForIcon(icon)
    const absolutePath = path.join(this.baseDirPath, relativePath)
    try {
      await mkdir(path.dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, content)
    } catch (err) {
      return new StaticIconStoreError(StaticIconStoreErrorCode.StorageError, `error writing icon content to ${absolutePath}`)
    }
  }

  async loadContent(icon: StaticIcon): Promise<NodeJS.ReadableStream | StaticIconStoreError> {
    const relativePath = relativeWritePathForIcon(icon)
    const contentPath = path.join(this.baseDirPath, relativePath)

    try {
      const fileHandle = await open(contentPath, 'r')
      return fileHandle.createReadStream()
    } catch (err) {
      const errno = err as NodeJS.ErrnoException
      const code = errno && errno.code === 'ENOENT' ? StaticIconStoreErrorCode.ContentNotFound : StaticIconStoreErrorCode.StorageError
      return new StaticIconStoreError(code, `error reading static icon ${icon.id}`)
    }
  }
}

function relativeWritePathForIcon(icon: StaticIcon): string {
  const registered = new Date(icon.registeredTimestamp)
  return path.join(
    String(registered.getUTCFullYear()),
    String(registered.getUTCMonth() + 1).padStart(2, '0'),
    icon.id
  )
}
