import { EntityIdFactory } from '../entities/entities.global'
import uniqid from 'uniqid'

export default class SimpleIdFactory implements EntityIdFactory {
  async nextId(): Promise<string> {
    return uniqid()
  }
}