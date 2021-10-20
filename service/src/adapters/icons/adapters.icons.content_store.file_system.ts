import { StaticIcon, StaticIconContentStore } from '../../entities/icons/entities.icons'

export class FileSystemIconContentStore implements StaticIconContentStore {

  putContent(icon: StaticIcon, content: NodeJS.ReadableStream): Promise<void> {
    throw new Error('Method not implemented.')
  }

  loadContent(id: string): Promise<NodeJS.ReadableStream | null> {
    throw new Error('Method not implemented.')
  }
}
