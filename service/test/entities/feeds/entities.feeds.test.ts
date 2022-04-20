import uniqid from 'uniqid'
import { FeedCreateUnresolved, FeedTopic, FeedCreateMinimal, ResolvedMapStyle, FeedCreateAttrs, validateSchemaPropertyReferencesForFeed, FeedsError, InvalidFeedAttrsErrorData, InvalidFeedAttrsError, ErrInvalidFeedAttrs } from '../../../lib/entities/feeds/entities.feeds'
import { expect } from 'chai'
import { URL } from 'url'

describe('feed-create attribute factory', function() {

  it('applies the feed attribute when present', function() {

    const topic: FeedTopic = {
      id: uniqid(),
      title: 'Topic Title',
      summary: 'About the topic',
      icon: { sourceUrl: new URL('test:///topic.png') },
      itemsHaveIdentity: true,
      itemsHaveSpatialDimension: true,
      itemPrimaryProperty: 'topicPrimary',
      itemSecondaryProperty: 'topicSecondary',
      itemTemporalProperty: 'topicTemporal',
      updateFrequencySeconds: 3600,
      paramsSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          key: { type: 'string' }
        },
        required: [ 'key' ]
      },
      mapStyle: {
        stroke: 'abc123',
        strokeOpacity: 0.5
      }
    }
    const minimal: Required<FeedCreateMinimal> & { mapStyle: Required<ResolvedMapStyle> } = {
      service: uniqid(),
      topic: topic.id,
      title: 'Feed Title',
      summary: 'About the feed',
      icon: { id: uniqid() },
      itemsHaveIdentity: false,
      itemsHaveSpatialDimension: false,
      itemPrimaryProperty: null,
      itemSecondaryProperty: null,
      itemTemporalProperty: 'feedTemporal',
      updateFrequencySeconds: 600,
      constantParams: {
        key: 'abc123'
      },
      variableParamsSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', maximum: 200, default: 25 }
        }
      },
      mapStyle: {
        stroke: 'abcddd',
        strokeOpacity: 0.4,
        strokeWidth: 1.5,
        fill: 'aaa111',
        fillOpacity: 0.2,
        icon: { id: uniqid() }
      },
      itemPropertiesSchema: {
        type: 'object',
        title: 'Test Items',
        properties: {
          feedTemporal: {
            type: 'number',
            format: 'urn:mage:epoch'
          }
        }
      },
      localization: {
        'x-test': {
          title: 'Alt Title'
        }
      }
    }
    const expected: Omit<Required<FeedCreateUnresolved>, 'id' | 'itemPrimaryProperty' | 'itemSecondaryProperty'> = {
      service: minimal.service,
      topic: topic.id,
      title: minimal.title,
      summary: minimal.summary!,
      icon: minimal.icon!,
      itemsHaveIdentity: false,
      itemsHaveSpatialDimension: false,
      itemTemporalProperty: minimal.itemTemporalProperty!,
      updateFrequencySeconds: minimal.updateFrequencySeconds!,
      constantParams: minimal.constantParams!,
      variableParamsSchema: minimal.variableParamsSchema!,
      mapStyle: minimal.mapStyle,
      itemPropertiesSchema: minimal.itemPropertiesSchema!,
      localization: minimal.localization!,
      unresolvedIcons: []
    }
    const createAttrs = FeedCreateUnresolved(topic, minimal)

    expect(createAttrs).to.deep.equal(expected)
    expect(createAttrs).to.not.have.property('itemPrimaryProperty')
    expect(createAttrs).to.not.have.property('itemSecondaryProperty')
  })

  it('applies the topic attributes when feed attributes are not present', function() {

    const topic: Required<FeedTopic> = {
      id: uniqid(),
      title: 'Topic Title',
      summary: 'About the topic',
      icon: { sourceUrl: new URL('test://icons/topic.png') },
      itemsHaveIdentity: true,
      itemsHaveSpatialDimension: true,
      itemPrimaryProperty: 'topicPrimary',
      itemSecondaryProperty: 'topicSecondary',
      itemTemporalProperty: 'topicTemporal',
      updateFrequencySeconds: 3600,
      paramsSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          key: { type: 'string' }
        },
        required: [ 'key' ]
      },
      mapStyle: {
        icon: { sourceUrl: new URL('https://icons.net/building.png') },
        stroke: 'abcabc',
        strokeOpacity: 0.5
      },
      itemPropertiesSchema: {
        title: 'Topic Properties'
      },
      localization: {
        'x-test': {
          title: 'Alt Title',
          summary: 'Alt Summary'
        }
      }
    }
    const minimal: FeedCreateMinimal = {
      service: uniqid(),
      topic: topic.id,
      summary: 'About the feed',
      itemTemporalProperty: null
    }
    const createAttrs = FeedCreateUnresolved(topic, minimal)

    expect(createAttrs).to.deep.equal({
      service: minimal.service,
      topic: topic.id,
      title: topic.title,
      summary: minimal.summary,
      itemsHaveIdentity: topic.itemsHaveIdentity,
      itemsHaveSpatialDimension: topic.itemsHaveSpatialDimension,
      itemPrimaryProperty: topic.itemPrimaryProperty,
      itemSecondaryProperty: topic.itemSecondaryProperty,
      updateFrequencySeconds: topic.updateFrequencySeconds,
      mapStyle: {
        icon: topic.mapStyle.icon,
        stroke: topic.mapStyle.stroke,
        strokeOpacity: topic.mapStyle.strokeOpacity
      },
      itemPropertiesSchema: topic.itemPropertiesSchema,
      icon: topic.icon,
      unresolvedIcons: [ topic.icon.sourceUrl, topic.mapStyle.icon?.sourceUrl ],
      localization: topic.localization
    })
  })

  it('deep copies the map style', function() {

    const topic: Required<FeedTopic> = {
      id: uniqid(),
      title: 'Topic Title',
      summary: 'About the topic',
      icon: { sourceUrl: new URL('test:///topic.png') },
      itemsHaveIdentity: true,
      itemsHaveSpatialDimension: true,
      itemPrimaryProperty: 'topicPrimary',
      itemSecondaryProperty: 'topicSecondary',
      itemTemporalProperty: 'topicTemporal',
      updateFrequencySeconds: 3600,
      paramsSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          key: { type: 'string' }
        },
        required: [ 'key' ]
      },
      mapStyle: {
        icon: { sourceUrl: new URL('https://icons.net/building.png') },
        fill: 'abc123'
      },
      itemPropertiesSchema: {
        title: 'Topic Properties'
      },
      localization: {}
    }
    const minimal: FeedCreateMinimal = {
      service: uniqid(),
      topic: topic.id,
      summary: 'About the feed',
      itemTemporalProperty: null
    }
    const createAttrs = FeedCreateUnresolved(topic, minimal) as FeedCreateUnresolved

    expect(createAttrs.mapStyle).to.deep.equal({
      icon: { sourceUrl: topic.mapStyle.icon?.sourceUrl },
      fill: topic.mapStyle.fill
    })
    expect(createAttrs.mapStyle).to.not.equal(topic.mapStyle)
  })

  it('applies resolved icon ids to the unresolved feed create attrs', async function() {

    const unresolvedIcons = [ new URL('test:///resolve/1.png'), new URL('test:///resolve/2.png') ]
    const resolvedIcons = {
      [String(unresolvedIcons[0])]: uniqid(),
      [String(unresolvedIcons[1])]: uniqid()
    }
    const unresolved: FeedCreateUnresolved = {
      service: uniqid(),
      topic: uniqid(),
      title: 'Test',
      itemsHaveIdentity: true,
      itemsHaveSpatialDimension: true,
      icon: { sourceUrl: unresolvedIcons[0] },
      mapStyle: {
        icon: { sourceUrl: unresolvedIcons[1] }
      },
      unresolvedIcons
    }
    const resolved = FeedCreateAttrs(unresolved, resolvedIcons)

    expect(resolved.icon?.id).to.equal(resolvedIcons[String(unresolvedIcons[0])])
    expect(resolved.mapStyle?.icon?.id).to.equal(resolvedIcons[String(unresolvedIcons[1])])
  })

  it('leaves registered icon references intact', function() {

    const unresolvedIcons: URL[] = [ new URL('test://register.png') ]
    const resolvedIcons = {
      [String(unresolvedIcons[0])]: uniqid()
    }
    const unresolved: FeedCreateUnresolved = {
      service: uniqid(),
      topic: uniqid(),
      title: 'Test',
      itemsHaveIdentity: true,
      itemsHaveSpatialDimension: true,
      icon: { sourceUrl: unresolvedIcons[0] },
      mapStyle: {
        icon: { id: 'registered1' }
      },
      unresolvedIcons
    }
    const resolved = FeedCreateAttrs(unresolved, resolvedIcons)

    expect(resolved.icon?.id).to.equal(resolvedIcons[String(unresolvedIcons[0])])
    expect(resolved.mapStyle?.icon?.id).to.equal('registered1')

    const resolvedAgain = FeedCreateAttrs({ ...resolved, unresolvedIcons }, {})

    expect(resolvedAgain.icon?.id).to.equal(resolvedIcons[String(unresolvedIcons[0])])
    expect(resolvedAgain.mapStyle?.icon?.id).to.equal('registered1')
  })
})

describe('item properties schema validation', function() {

  it('succeeds when the schema is not present', function() {

    let feed: FeedCreateMinimal = {
      service: uniqid(),
      topic: uniqid(),
    }
    let valid = validateSchemaPropertyReferencesForFeed(feed)

    expect(valid).to.equal(feed)

    feed = {
      ...feed,
      itemPropertiesSchema: null
    }
    valid = validateSchemaPropertyReferencesForFeed(feed)

    expect(valid).to.equal(feed)

    feed = {
      ...feed,
      itemPropertiesSchema: undefined
    }
    valid = validateSchemaPropertyReferencesForFeed(feed)

    expect(valid).to.equal(feed)
  })

  it('succeeds when the schema has primary, secondary, and temporal properties', function() {

    const feedBase: FeedCreateMinimal = {
      service: uniqid(),
      topic: uniqid(),
      itemPropertiesSchema: {
        properties: {
          type: { type: 'string' },
          variant: { type: 'string' },
          when: { type: 'string' }
        }
      }
    }

    let feed: FeedCreateMinimal = {
      ...feedBase,
      itemPrimaryProperty: 'type'
    }
    let valid = validateSchemaPropertyReferencesForFeed(feed)

    expect(valid).to.equal(feed)

    feed = {
      ...feedBase,
      itemSecondaryProperty: 'variant'
    }
    valid = validateSchemaPropertyReferencesForFeed(feed)

    expect(valid).to.equal(feed)

    feed = {
      ...feedBase,
      itemTemporalProperty: 'when'
    }
    valid = validateSchemaPropertyReferencesForFeed(feed)

    expect(valid).to.equal(feed)

    feed = {
      ...feedBase,
      itemPrimaryProperty: 'type',
      itemSecondaryProperty: 'variant',
      itemTemporalProperty: 'when'
    }
    valid = validateSchemaPropertyReferencesForFeed(feed)

    expect(valid).to.equal(feed)
  })

  it('succeeds when primary, secondary, or temporal properties are the same', function() {

    const feedBase: FeedCreateMinimal = {
      service: uniqid(),
      topic: uniqid(),
      itemPropertiesSchema: {
        properties: {
          prop1: { type: 'string' },
          prop2: { type: 'string' },
          prop3: { type: 'string' }
        }
      },
      itemPrimaryProperty: 'prop1',
      itemSecondaryProperty: 'prop2',
      itemTemporalProperty: 'prop3'
    }

    let feed: FeedCreateMinimal = {
      ...feedBase,
      itemPrimaryProperty: 'prop2'
    }
    let valid = validateSchemaPropertyReferencesForFeed(feed)

    expect(valid).to.equal(feed)

    feed = {
      ...feedBase,
      itemSecondaryProperty: 'prop1',
    }
    valid = validateSchemaPropertyReferencesForFeed(feed)

    expect(valid).to.equal(feed)

    feed = {
      ...feedBase,
      itemTemporalProperty: 'prop2'
    }
    valid = validateSchemaPropertyReferencesForFeed(feed)

    expect(valid).to.equal(feed)
  })

  it('fails when the schema is missing any of primary, secondary, or temporal properties', function() {

    const feedBase: FeedCreateMinimal = {
      service: uniqid(),
      topic: uniqid(),
      itemPropertiesSchema: {
        properties: {
          prop1: { type: 'string' },
          prop2: { type: 'string' },
          prop3: { type: 'string' }
        }
      },
      itemPrimaryProperty: 'prop1',
      itemSecondaryProperty: 'prop2',
      itemTemporalProperty: 'prop3'
    }

    let feed: FeedCreateMinimal = {
      ...feedBase,
      itemPrimaryProperty: 'missing'
    }
    let valid: InvalidFeedAttrsError = validateSchemaPropertyReferencesForFeed(feed) as InvalidFeedAttrsError

    expect(valid).to.be.instanceOf(FeedsError)
    expect(valid.code).to.equal(ErrInvalidFeedAttrs)

    feed = {
      ...feedBase,
      itemSecondaryProperty: 'missing',
    }
    valid = validateSchemaPropertyReferencesForFeed(feed) as InvalidFeedAttrsError

    expect(valid).to.be.instanceOf(FeedsError)
    expect(valid.code).to.equal(ErrInvalidFeedAttrs)

    feed = {
      ...feedBase,
      itemTemporalProperty: 'missing'
    }
    valid = validateSchemaPropertyReferencesForFeed(feed) as InvalidFeedAttrsError

    expect(valid).to.be.instanceOf(FeedsError)
    expect(valid.code).to.equal(ErrInvalidFeedAttrs)
  })
})
