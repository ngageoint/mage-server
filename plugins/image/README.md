# MAGE Image Plugin

The MAGE Image plugin will ensure that all images clients attach to observations
are rotated properly according to the image EXIF data.  The plugin will also
create thumbnails of configured sizes for each image attachment.  MAGE clients
will attempt to pull the smaller thumbnail images for certain views based on the
client's view size and resolution. Enabling this plugin is optional.

## Configuration

The image plugin utilizes the basic [plugin state repository](../../service/src/plugins.api/index.ts) that core MAGE
Service provides to store its configuration.  The configuration document is
fairly simple, and looks like
```json
{
  enabled: false,
  intervalSeconds: 60,
  intervalBatchSize: 10,
  thumbnailSizes: [ 150, 320, 800, 1024, 2048 ],
}
```

TODO:

```json
[
  {
    "$match": {
      "attachments.oriented": false,
      "attachments.contentType": {},
      "lastModified": {
        "$gte": "1970-01-01T00:00:00.000Z",
        "$lte": "2022-07-24T14:34:44.926Z"
      }
    }
  },
  {
    "$sort": {
      "lastModified": 1,
      "_id": 1
    }
  },
  {
    "$project": {
      "observationId": "$_id",
      "_id": false,
      "attachments": {
        "$filter": {
          "input": "$attachments",
          "as": "att",
          "cond": {
            "$and": [
              {
                "$eq": [
                  "$$att.oriented",
                  false
                ]
              },
              {
                "$gt": [
                  "$$att.relativePath",
                  null
                ]
              },
              {
                "$eq": [
                  {
                    "$indexOfBytes": [
                      "$$att.contentType",
                      "image/"
                    ]
                  },
                  0
                ]
              }
            ]
          }
        }
      }
    }
  },
  {
    "$unwind": "$attachments"
  },
  {
    "$project": {
      "observationId": 1,
      "attachmentId": "$attachments._id"
    }
  },
  {
    "$limit": 24
  }
]
```