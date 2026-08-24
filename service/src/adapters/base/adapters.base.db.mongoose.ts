import mongoose from 'mongoose'
import { PagingParameters } from '../../entities/entities.global'

type EntityReference<ID extends string | number = string | number> = ID extends { id: string | number } ? Pick<Required<ID>, 'id'> : { id: ID }

/**
 * Map Mongoose `Document` instances to plain entity objects.
 */
export type DocumentMapping<D, E extends object> = (doc: mongoose.HydratedDocument<D>) => E
/**
 * Map entities to objects suitable to create Mongoose `Document` instances, as
 * in `new mongoose.Model(stub)`.
 */
export type EntityMapping<D, E extends object> = (entity: Partial<E>) => Partial<D>

/**
 * Return a document mapping that calls `toJSON()` on the given `Document`
 * instance and returns the result.
 */
export function createDefaultDocMapping<D, E extends object>(): DocumentMapping<D, E> {
  return (d): any => d.toJSON<E>()
}

/**
 * Return an entity mapping that simply returns the given entity object as is.
 */
export function createDefaultEntityMapping<D, E extends object>(): EntityMapping<D, E> {
  return e => e as any
}

/**
 * * Type parameter `D` is the type of the document as stored in MongoDB.
 * * Type parameter `M` is a `mongoose.Model<D>` that creates "hydrated" instances of `D`.
 * * Type parameter `E` is the entity attributes type, which is typically a
 *   plain object interface, and is the type that repository queries return
 *   using `entityForDocument()`.
 */
export class BaseMongooseRepository<D, M extends mongoose.Model<any>, E extends object> {

  readonly model: M
  readonly entityForDocument: DocumentMapping<D, E>
  readonly documentStubForEntity: EntityMapping<D, E>

  constructor(model: M, mapping?: { docToEntity?: DocumentMapping<D, E>, entityToDocStub?: EntityMapping<D, E> }) {
    this.model = model
    this.entityForDocument = mapping?.docToEntity || createDefaultDocMapping()
    this.documentStubForEntity = mapping?.entityToDocStub || createDefaultEntityMapping()
  }

  async create(attrs: Partial<E>): Promise<E> {
    const stub = this.documentStubForEntity(attrs)
    const created = await this.model.create(stub)
    return this.entityForDocument(created)
  }

  async findAll(): Promise<E[]> {
    const docs = this.model.find().cursor()
    const entities: E[] = []
    for await (const doc of docs) {
      entities.push(this.entityForDocument(doc))
    }
    return entities
  }

  async findById(id: any): Promise<E | null> {
    const doc = await this.model.findById(id)
    return doc ? this.entityForDocument(doc) : null as any
  }

  async findAllByIds<ID>(ids: ID[]): Promise<ID extends string ? { [id: string]: E | null } : ID extends number ? { [id: number]: E | null } : never> {
    if (!ids.length) {
      return {} as any
    }
    const notFound = ids.reduce((notFound, id) => {
      notFound[id] = null
      return notFound
    }, {} as any)
    const docs = await this.model.find({ _id: { $in: ids } })
    const found = {} as any
    for (const doc of docs) {
      found[doc.id] = this.entityForDocument(doc)
      delete notFound[doc.id]
    }
    return { ...notFound, ...found }
  }

  async update(attrs: Partial<E> & EntityReference): Promise<E | null> {
    if (attrs.id == null) {
      throw new Error('update requires an id')
    }
    const found = await this.model.findById(attrs.id)
    if (!found) {
      throw new Error(`document not found for id: ${attrs.id}`)
    }
    const stub = this.documentStubForEntity(attrs)
    found.set(stub)
    const saved = await found.save()
    return this.entityForDocument(saved)
  }

  async removeById(id: any): Promise<E | null> {
    const doc = await this.model.findByIdAndDelete(id)
    if (doc) {
      return this.entityForDocument(doc)
    }
    return null
  }
}

export const pageQuery = <RT, DT>(query: mongoose.Query<RT, DT>, paging: PagingParameters): Promise<{ totalCount: number | null, query: mongoose.Query<RT, DT> }> => {
  const BaseQuery = query.toConstructor()
  const pageQuery = new BaseQuery().limit(paging.pageSize).skip(paging.pageIndex * paging.pageSize) as mongoose.Query<RT, DT>
  const includeTotalCount = typeof paging.includeTotalCount === 'boolean' ? paging.includeTotalCount : paging.pageIndex === 0
  if (includeTotalCount) {
    const countQuery = new BaseQuery().countDocuments()
    return countQuery.then(totalCount => ({ totalCount, query: pageQuery }))
  }
  return Promise.resolve({ totalCount: null, query: pageQuery })
}
