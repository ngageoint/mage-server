# Mongoose Development Guidelines and Patterns

## Types
* DocType vs. Entity
* Entity with JsonObject mapped to DocType causes TS error
  _Type instantiation is excessively deep and possibly infinite.ts(2589)_
  because of JsonObject recursive type definition
```
export type FeedServiceDocument = Omit<FeedService, 'id' | 'serviceType'> & {
  _id: mongoose.Types.ObjectId
  serviceType: mongoose.Types.ObjectId
  // config: any
}
export type FeedServiceModel = Model<FeedServiceDocument>
export const FeedServiceSchema = new mongoose.Schema<FeedServiceDocument, FeedServiceModel>(
  {
    serviceType: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: FeedsModels.FeedServiceTypeIdentity },
    title: { type: String, required: true },
    summary: { type: String, required: false },
    config: { type: Object, required: false },
  },
  {
    toJSON: {
      getters: true,
      versionKey: false,
      transform: (doc: FeedServiceDocument, json: any & FeedService): void => {
        delete json._id
        json.serviceType = doc.serviceType.toHexString()
      }
    }
  })
```

```
var o: ObservationDocument = null
var l: mongoose.LeanDocument<ObservationDocument> = null
o = l
```