import mongoose from 'mongoose'
import { PagingParameters } from '../../entities/entities.global'

type EntityReference = { id: string | number }

export type MongooseDefaultVersionKey = '__v'
export const MongooseDefaultVersionKey: MongooseDefaultVersionKey = '__v'
export type WithMongooseDefaultVersionKey = { [MongooseDefaultVersionKey]: number }

/**
 * Map Mongoose `Document` instances to plain entity objects.
 */
export type DocumentMapping<DocType extends mongoose.AnyObject, E extends object> = (doc: DocType | mongoose.HydratedDocument<DocType> | mongoose.LeanDocument<DocType>) => E
/**
 * Map entities to objects suitable to create Mongoose `Model` `Document` instances, as
 * in `new mongoose.Model(stub)`.
 */
export type EntityMapping<DocType extends mongoose.AnyObject, E extends object> = (entity: Partial<E>) => Partial<DocType>

/**
 * Return a document mapping that calls {@link mongoose.Document.toObject()} on the given `Document`
 * instance and returns the result.
 */
export function createDefaultDocMapping<DocType extends mongoose.AnyObject>(): DocumentMapping<DocType, any> {
  return d => {
    if (d instanceof mongoose.Document) {
      return d.toObject()
    }
    return d
  }
}

/**
 * Return an entity mapping that simply returns the given entity object as is.
 */
export function createDefaultEntityMapping<DocType extends mongoose.AnyObject, E extends object>(): EntityMapping<DocType, E> {
  return e => e as any
}

/**
 * * Type parameter `DocType` is the shape of the raw document the MongoDB driver stores and retrieves.
 * * Type parameter `Model` is a subtpye of `mongoose.Model<D>` that creates instances of type `D`.
 * * Type parameter `Entity` is the entity attributes type, which is typically a plain object interface,
 *   or an instantiable class and is the type that repository queries return using `entityForDocument()`.
 */
export class BaseMongooseRepository<DocType extends mongoose.AnyObject, Model extends mongoose.Model<DocType> = mongoose.Model<DocType>, Entity extends object = DocType> {

  readonly model: Model
  readonly entityForDocument: DocumentMapping<DocType, Entity>
  readonly documentStubForEntity: EntityMapping<DocType, Entity>

  /**
   * When the caller omits `docToEntity` and/or `entityToDocStub`
   */
  constructor(model: Model, mapping?: { docToEntity?: DocumentMapping<DocType, Entity>, entityToDocStub?: EntityMapping<DocType, Entity> }) {
    this.model = model
    this.entityForDocument = mapping?.docToEntity || createDefaultDocMapping()
    this.documentStubForEntity = mapping?.entityToDocStub || createDefaultEntityMapping()
  }

  async create(attrs: Partial<Entity>): Promise<Entity> {
    const stub = this.documentStubForEntity(attrs)
    const created = await this.model.create(stub)
    return this.entityForDocument(created)
  }

  async findAll(): Promise<Entity[]> {
    const docs = await this.model.find().cursor()
    const entities: Entity[] = []
    for await (const doc of docs) {
      entities.push(this.entityForDocument(doc))
    }
    return entities
  }

  async findById(id: any): Promise<Entity | null> {
    const doc = await this.model.findById(id)
    return doc ? this.entityForDocument(doc) : null as any
  }

  /**
   * _NOTE_ this currently only explicitly supports 'string' and 'number' IDs, though Mongoose will implicitly
   * [cast](https://mongoosejs.com/docs/6.x/docs/tutorials/query_casting.html) a filter's `_id` entry to `ObjectID`
   * before sending the query through the driver.
   */
  async findAllByIds<ID>(ids: ID[]): Promise<ID extends string ? { [id: string]: Entity | null } : ID extends number ? { [id: number]: Entity | null } : never> {
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
      const _id = typeof doc._id === 'number' || doc._id === 'string' ? doc._id : String(doc._id)
      found[_id] = this.entityForDocument(doc)
      delete notFound[doc.id]
    }
    return { ...notFound, ...found }
  }

  async update(attrs: Partial<Entity> & EntityReference): Promise<Entity | null> {
    let doc = (await this.model.findById(attrs.id))
    if (!doc) {
      throw new Error(`document not found for id: ${attrs.id}`)
    }
    const stub = this.documentStubForEntity(attrs)
    doc.set(stub)
    doc = await doc.save()
    return this.entityForDocument(doc)
  }

  async removeById(id: any): Promise<Entity | null> {
    const doc = await this.model.findByIdAndRemove(id)
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
    const countQuery = new BaseQuery().count()
    return countQuery.then((totalCount: number) => {
      return { totalCount, query: pageQuery }
    })
  }
  return Promise.resolve({
    totalCount: null,
    query: pageQuery
  })
}