import mongoose from 'mongoose'
import { pageOf, PageOf, PagingParameters } from '../../entities/entities.global'

type EntityReference = { id: string | number }

type DocumentMapping<D extends mongoose.Document, E extends object> = (doc: D) => E
type EntityMapping<D extends mongoose.Document, E extends object> = (entity: Partial<E>) => any

function createDefaultDocMapping<D extends mongoose.Document, E extends object>(): DocumentMapping<D, E> {
  return (d): any => d.toJSON()
}

function createDefaultEntityMapping<D extends mongoose.Document, E extends object>(): EntityMapping<D, E> {
  return e => e as any
}

export async function waitForMongooseConnection(): Promise<mongoose.Connection> {
  throw new Error('unimplemented')
}

export class BaseMongooseRepository<D extends mongoose.Document, M extends mongoose.Model<D>, E extends object> {

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
    const docs = await this.model.find().cursor()
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
    const docs = await this.model.find({ _id: { $in: ids }})
    const found = {} as any
    for (const doc of docs) {
      found[doc.id] = this.entityForDocument(doc)
      delete notFound[doc.id]
    }
    return { ...notFound, ...found }
  }

  async update(attrs: Partial<E> & EntityReference): Promise<E | null> {
    let doc = (await this.model.findById(attrs.id))
    if (!doc) {
      throw new Error(`document not found for id: ${attrs.id}`)
    }
    const stub = this.documentStubForEntity(attrs)
    doc.set(stub)
    doc = await doc.save()
    return this.entityForDocument(doc)
  }

  async removeById(id: any): Promise<E | null> {
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