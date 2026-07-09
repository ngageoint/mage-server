
import { URL } from 'url'
import mongoose from 'mongoose'
import { EntityIdFactory, pageOf, PageOf, PagingParameters, UrlResolutionError, UrlScheme } from '../../entities/entities.global'
import { StaticIcon, StaticIconStub, StaticIconId, StaticIconRepository, LocalStaticIconStub, StaticIconReference, StaticIconContentStore, StaticIconImportFetch, StaticIconStoreError } from '../../entities/icons/entities.icons'
import { BaseMongooseRepository, pageQuery } from '../base/adapters.base.db.mongoose'

export type StaticIconDocument = Omit<StaticIcon, 'sourceUrl'> & mongoose.Document & {
  sourceUrl: string
}
export type StaticIconModel = mongoose.Model<StaticIconDocument>
export const StaticIconModelName = 'StaticIcon'
export const StaticIconSchema = new mongoose.Schema<StaticIconDocument>(
  {
    _id: { type: String as any, required: true },
    sourceUrl: { type: String, required: false, unique: true, sparse: true },
    registeredTimestamp: { type: Number, required: true },
    resolvedTimestamp: { type: Number, required: false },
    contentHash: { type: String, required: false },
    contentTimestamp: { type: Number, required: false },
    imageType: { type: String, required: false },
    mediaType: { type: String, required: false },
    sizePixels: {
      type: {
        _id: false,
        width: { type: Number, required: true },
        height: { type: Number, required: true }
      },
      required: false
    },
    sizeBytes: { type: Number, required: false },
    tags: [String],
    title: { type: String, required: false },
    summary: { type: String, required: false },
    fileName: { type: String, required: false },
  },
  {
    toJSON: {
      getters: true,
      versionKey: false,
      transform: (doc: StaticIconDocument, json: any & StaticIcon): void => {
        delete json._id
        json.sourceUrl = doc.sourceUrl ? new URL(doc.sourceUrl) : null
      }
    }
  }
)
export function StaticIconModel(conn: mongoose.Connection, collection?: string): StaticIconModel {
  return conn.model(StaticIconModelName, StaticIconSchema, collection || 'static_icons')
}

/**
 * TODO:
 * This class is doing too much.  The fetching and caching logic should belong
 * in one or more entity layer domain services of some kind.  This repository
 * should deal only with database operations.
 */
export class MongooseStaticIconRepository extends BaseMongooseRepository<StaticIconDocument, StaticIconModel, StaticIcon> implements StaticIconRepository {

  constructor(
    readonly model: StaticIconModel,
    private readonly idFactory: EntityIdFactory,
    private readonly contentStore: StaticIconContentStore,
    private readonly resolvers: UrlScheme[]
  ) {
    super(model)
  }

  async create(attrs: StaticIconStub & { sourceUrl: URL }): Promise<StaticIcon> {
    const _id = await this.idFactory.nextId()
    const withId = { _id, registeredTimestamp: Date.now(), ...attrs }
    return super.create(withId)
  }

  async findOrImportBySourceUrl(
    sourceUrl: URL,
    stub: StaticIconStub | null = null,
    fetch: StaticIconImportFetch = StaticIconImportFetch.Lazy
  ): Promise<StaticIcon | UrlResolutionError | StaticIconStoreError> {    
    stub = { sourceUrl, ...stub }

    if (typeof stub.contentHash === 'string' && typeof stub.contentTimestamp !== 'number') {
      stub.contentTimestamp = Date.now()
    }
    let doc = await this.findDocBySourceUrl(sourceUrl)
    if (doc) {
      doc = await updateRegisteredIconIfChanged.call(this, doc, stub)
    } else {
      const _id = await this.idFactory.nextId()
      doc = await this.model.create({ _id, sourceUrl, registeredTimestamp: Date.now(), ...stub })
    }
    switch (fetch) {
      case StaticIconImportFetch.EagerAwait:
        const stored = await this.fetchAndStore(doc)
        if (stored instanceof Error) {
          return stored
        }
        doc = stored
        break
      case StaticIconImportFetch.Eager:
        this.fetchAndStore(doc)
        break
      case StaticIconImportFetch.Lazy:
      default:
    }
    return this.entityForDocument(doc)
  }

  private async fetchAndStore(iconDoc: StaticIconDocument): Promise<StaticIconDocument | UrlResolutionError | StaticIconStoreError> {
    if (typeof iconDoc.resolvedTimestamp === 'number') {
      return iconDoc
    }
    const sourceUrl = new URL(iconDoc.sourceUrl)
    const resolver = this.resolvers.find(x => x.canResolve(sourceUrl))
    if (!resolver) {
      return new UrlResolutionError(sourceUrl, `no resolver for icon url ${iconDoc.sourceUrl}`)
    }
    const content = await resolver.resolveContent(sourceUrl)
    if (content instanceof UrlResolutionError) {
      return content
    }
    if (!resolver.isLocalScheme) {
      const res = await this.contentStore.putContent(this.entityForDocument(iconDoc), content)
      if (res instanceof StaticIconStoreError) {
        return res
      }
    }
    iconDoc = new this.model(iconDoc)
    iconDoc.resolvedTimestamp = Date.now()
    return await iconDoc.save()
  }

  async createLocal(iconContent: LocalStaticIconStub, iconStream: NodeJS.ReadableStream): Promise<StaticIcon> {
    const id = await this.idFactory.nextId()
    const icon: StaticIcon = { 
      id: id,
      registeredTimestamp: Date.now(),
      ...iconContent
    }

    await this.contentStore.putContent(icon, iconStream)
    const doc = await this.model.create({ ...icon, _id: id })

    return this.entityForDocument(doc)
  }

  async loadContent(
    id: StaticIconId
  ): Promise<[StaticIcon, NodeJS.ReadableStream] | null | UrlResolutionError | StaticIconStoreError> {
    const icon = await this.model.findById(id)
    if (!icon) {
      return null
    }

    if (icon.sourceUrl) {
      return this.loadRemoteContent(icon)
    } else {
      return this.loadLocalContent(icon)
    }
  }

  private async loadRemoteContent(
    icon: StaticIconDocument
  ): Promise<[StaticIcon, NodeJS.ReadableStream] | UrlResolutionError | StaticIconStoreError> {
    let sourceUrl: URL
    try {
      sourceUrl = new URL(icon.sourceUrl)
    } catch (err) {
      console.error(`error parsing source url ${icon.sourceUrl} of registered icon ${icon.id}:`, err)
      throw err
    }
    
    const resolver = this.resolvers.find(x => x.canResolve(sourceUrl))
    if (!resolver) {
      console.warn(`no scheme for registered icon`, icon)
      return new UrlResolutionError(sourceUrl, `no scheme found to resolve source url ${icon.sourceUrl} of icon ${icon.id}`)
    }

    let resolved: StaticIconDocument | UrlResolutionError | StaticIconStoreError = icon
    if (typeof icon.resolvedTimestamp !== 'number') {
      resolved = await this.fetchAndStore(icon)
      if (resolved instanceof Error) {
        console.error(`error fetching and storing icon to load content`, resolved)
        return resolved
      }
    }

    if (resolver.isLocalScheme) {
      const content = await resolver.resolveContent(sourceUrl)
      if (content instanceof UrlResolutionError) {
        console.error(`failed to resolve local icon url`, content)
        return content
      }
      return [ this.entityForDocument(icon), content ]
    }

    const content = await this.contentStore.loadContent({
      id: icon.id,
      sourceUrl: sourceUrl,
      registeredTimestamp: icon.registeredTimestamp
    })

    if (content instanceof StaticIconStoreError) {
      return content
    }

    return [ this.entityForDocument(resolved), content ]
  }

  private async loadLocalContent(
    icon: StaticIconDocument
  ): Promise<[StaticIcon, NodeJS.ReadableStream] | StaticIconStoreError> {
    const content = await this.contentStore.loadContent({
      id: icon.id,
      registeredTimestamp: icon.registeredTimestamp
    })

    if (content instanceof StaticIconStoreError) {
      return content
    }
    
    return [ this.entityForDocument(icon), content ]
  }

  async findBySourceUrl(url: URL): Promise<StaticIcon | null> {
    return await this.findDocBySourceUrl(url).then(x => x ? this.entityForDocument(x) : null)
  }

  async findByReference(ref: StaticIconReference): Promise<StaticIcon | null> {
    if (ref.id) {
      return await this.findById(ref.id)
    }
    if (ref.sourceUrl) {
      return await this.findBySourceUrl(ref.sourceUrl)
    }
    return null
  }

  async find(paging?: PagingParameters): Promise<PageOf<StaticIcon>> {
    paging = paging || { pageSize: 100, pageIndex: 0, includeTotalCount: false }
    const counted = await pageQuery(this.model.find().sort({ sourceUrl: 1 }), paging)
    const items: StaticIcon[] = []
    for await (const doc of counted.query.cursor()) {
      items.push(this.entityForDocument(doc))
    }
    return pageOf(items, paging, counted.totalCount)
  }

  private async findDocBySourceUrl(url: URL): Promise<StaticIconDocument | null> {
    return await this.model.findOne({ sourceUrl: url.toString() })
  }
}

async function updateRegisteredIconIfChanged(this: MongooseStaticIconRepository, registered: StaticIconDocument, stub: StaticIconStub): Promise<StaticIconDocument> {
  /*
  TODO: some of this logic could potentially be captured as an entity layer
  function, such as which properties a client is allowed to update when
  registering icon properties.  obviously the bit that builds the $unset
  operator is Mongo-specific.
  */
  if (stub.contentHash === registered.contentHash || typeof stub.contentHash !== 'string') {
    return registered
  }
  const writableKeys: { [valid in keyof StaticIconStub]: boolean } = {
    sourceUrl: false,
    contentHash: false,
    contentTimestamp: false,
    fileName: true,
    imageType: true,
    mediaType: true,
    sizeBytes: true,
    sizePixels: true,
    summary: true,
    tags: true,
    title: true
  }
  const update: Partial<StaticIconDocument> & mongoose.UpdateQuery<StaticIconDocument> = {}
  const $unset: { [key in keyof StaticIcon]?: true } = {}
  for (const key of Object.keys(writableKeys) as (keyof StaticIconStub)[]) {
    if (key in stub && stub[key] && writableKeys[key]) {
      update[key] = stub[key] as any
    }
    else if (writableKeys[key]) {
      $unset[key] = true
    }
  }
  if (Object.keys($unset).length > 0) {
    update.$unset = $unset as mongoose.UpdateQuery<StaticIconDocument>['$unset']
  }
  update.contentHash = stub.contentHash
  update.contentTimestamp = Date.now()
  if (stub.contentTimestamp) {
    if (!registered.contentTimestamp || stub.contentTimestamp > Number(registered.contentTimestamp)) {
      update.contentTimestamp = stub.contentTimestamp
    }
  }
  const updated = await this.model.findByIdAndUpdate(registered.id, update, { new: true, setDefaultsOnInsert: false })
  return updated!
}