import mongoose from 'mongoose'
import { PagingParameters } from '../../entities/entities.global'

type EntityReference = { id: string | number }

/**
 * Map Mongoose `Document` instances to plain entity objects.
 */
export type DocumentMapping<D extends mongoose.Document, E extends object> = (doc: D) => E
/**
 * Map entities to objects suitable to create Mongoose `Document` instances, as
 * in `new mongoose.Model(stub)`.
 */
export type EntityMapping<D extends mongoose.Document, E extends object> = (entity: Partial<E>) => any

/**
 * Return a document mapping that calls `toJSON()` on the given `Document`
 * instance and returns the result.
 */
export function createDefaultDocMapping<D extends mongoose.Document, E extends object>(): DocumentMapping<D, E> {
  return (d): any => d.toJSON()
}

/**
 * Return an entity mapping that simply returns the given entity object as is.
 */
export function createDefaultEntityMapping<D extends mongoose.Document, E extends object>(): EntityMapping<D, E> {
  return e => e as any
}

/**
 * * Type parameter `D` is a subtype of `mongoose.Document`
 * * Type parameter `M` is a subtpye of `mongoose.Model<D>` that creates
 *   instances of type `D`.
 * * Type parameter `Attrs` is the entity attributes type, which is typically a
 *   plain object interface, and is the type that repository queries return
 *   using `entityForDocuent()`.
 * * Type parameter `Entity` is an optional, typically more objected-oriented
 *   entity type that provides extra functionality beyond just the raw data
 *   of the `Attrs` type.
 */
export class BaseMongooseRepository<D extends mongoose.Document, M extends mongoose.Model<D>, Attrs extends object, Entity extends object = Attrs> {

  readonly model: M
  readonly entityForDocument: DocumentMapping<D, Attrs>
  readonly documentStubForEntity: EntityMapping<D, Attrs>

  constructor(model: M, mapping?: { docToEntity?: DocumentMapping<D, Attrs>, entityToDocStub?: EntityMapping<D, Attrs> }) {
    this.model = model
    this.entityForDocument = mapping?.docToEntity || createDefaultDocMapping()
    this.documentStubForEntity = mapping?.entityToDocStub || createDefaultEntityMapping()
  }

  async create(attrs: Partial<Attrs>): Promise<Attrs> {
    const stub = this.documentStubForEntity(attrs)
    const created = await this.model.create(stub)
    return this.entityForDocument(created)
  }

  async findAll(): Promise<Attrs[]> {
    const docs = await this.model.find().cursor()
    const entities: Attrs[] = []
    for await (const doc of docs) {
      entities.push(this.entityForDocument(doc))
    }
    return entities
  }

  async findById(id: any): Promise<Attrs | null> {
    const doc = await this.model.findById(id)
    return doc ? this.entityForDocument(doc) : null as any
  }

  async findAllByIds<ID>(ids: ID[]): Promise<ID extends string ? { [id: string]: Attrs | null } : ID extends number ? { [id: number]: Attrs | null } : never> {
    if (!ids.length) {
      return {} as any
    }
    const notFound = ids.reduce((notFound, id) => {
      notFound[id] = null
      return notFound
    }, {} as any)
    const docs = await this.model.find({ _id: { $in: ids }})
    const found = {} as any
    for (const doc of docs) {
      found[doc.id] = this.entityForDocument(doc)
      delete notFound[doc.id]
    }
    return { ...notFound, ...found }
  }

  async update(attrs: Partial<Attrs> & EntityReference): Promise<Attrs | null> {
    let doc = (await this.model.findById(attrs.id))
    if (!doc) {
      throw new Error(`document not found for id: ${attrs.id}`)
    }
    const stub = this.documentStubForEntity(attrs)
    doc.set(stub)
    doc = await doc.save()
    return this.entityForDocument(doc)
  }

  async removeById(id: any): Promise<Attrs | null> {
    const doc = await this.model.findByIdAndRemove(id)
    if (doc) {
      return this.entityForDocument(doc)
    }
    return null
  }
}

export const pageQuery = <T>(query: mongoose.Query<T>, paging: PagingParameters): Promise<{ totalCount: number | null, query: mongoose.Query<T> }> => {
  const BaseQuery = query.toConstructor()
  const pageQuery = new BaseQuery().limit(paging.pageSize).skip(paging.pageIndex * paging.pageSize) as mongoose.Query<T>
  const includeTotalCount = typeof paging.includeTotalCount === 'boolean' ? paging.includeTotalCount : paging.pageIndex === 0
  if (includeTotalCount) {
    const countQuery = new BaseQuery().count()
    return countQuery.then(totalCount => {
      return { totalCount, query: pageQuery }
    })
  }
  return Promise.resolve({
    totalCount: null,
    query: pageQuery
  })
}