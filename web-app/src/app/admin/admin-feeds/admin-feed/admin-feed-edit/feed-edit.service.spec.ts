import { Observable, of, NextObserver, MonoTypeOperatorFunction, throwError } from 'rxjs'
import { distinctUntilChanged, pluck } from 'rxjs/operators'
import { FeedEditService, FeedEditStateObservers } from './feed-edit.service'
import { FeedService } from '@ngageoint/mage.web-core-lib/feed/feed.service'
import { FeedExpanded, FeedPreview, FeedTopic, Service } from '@ngageoint/mage.web-core-lib/feed/feed.model'
import { FeedEditState, FeedMetaData, feedMetaDataLean, feedPostFromEditState } from './feed-edit.model'
import * as _ from 'lodash'


const emptyState: Readonly<FeedEditState> = Object.freeze({
  originalFeed: null,
  availableServices: [],
  selectedService: null,
  availableTopics: [],
  selectedTopic: null,
  fetchParameters: null,
  itemPropertiesSchema: null,
  feedMetaData: null,
  preview: null,
})

const emptyPreview: Readonly<FeedPreview> = Object.freeze({
  content: {
    feed: 'empty',
    items: {
      type: 'FeatureCollection',
      features: []
    }
  },
  feed: {
    id: 'preview',
    title: 'Empty',
    service: 'empty',
    topic: 'empty'
  }
})

const services: Service[] = [
  Object.freeze({
    id: 'service1',
    serviceType: 'type1',
    title: 'Service 1',
    summary: 'Testing 1',
    config: {
      test: true
    }
  }),
  Object.freeze({
    id: 'service2',
    serviceType: 'type1',
    title: 'Service 2',
    summary: 'Testing 2',
    config: {
      test: true,
      secret: 546653765
    }
  })
]

const topicsForService: { [serviceId: string]: FeedTopic[] } = {
  [services[0].id]: [
    {
      id: 'service1.topic1',
      title: 'Service 1 Topic 1',
      itemPrimaryProperty: 'prop1',
      itemsHaveIdentity: false,
      itemTemporalProperty: 'prop2',
      itemPropertiesSchema: {
        properties: {
          prop1: {
            type: 'string'
          },
          prop2: {
            type: 'number'
          }
        }
      }
    },
    {
      id: 'service1.topic2',
      title: 'Service 1 Topic 2',
      itemsHaveIdentity: false,
      itemsHaveSpatialDimension: true,
      itemPrimaryProperty: 'prop1',
      itemTemporalProperty: 'prop2',
      itemPropertiesSchema: {
        properties: {
          prop1: {
            type: 'string'
          },
          prop2: {
            type: 'number'
          }
        }
      },
      paramsSchema: {
        properties: {
          when: 'number'
        }
      }
    }
  ],
  [services[1].id]: [
    {
      id: 'service2.topic1',
      title: 'Service 2 Topic 1',
      summary: 'Service 2 Topic 1 for testing',
      itemsHaveIdentity: true,
      itemsHaveSpatialDimension: true,
      itemPrimaryProperty: 'prop1',
      itemSecondaryProperty: 'prop3',
      itemTemporalProperty: 'prop2',
      itemPropertiesSchema: {
        properties: {
          prop1: {
            type: 'string'
          },
          prop2: {
            type: 'number'
          },
          prop3: {
            type: 'string'
          }
        }
      },
      paramsSchema: {
        properties: {
          when: 'number',
          who: 'string'
        }
      }
    }
  ]
}

class Recorder<T> implements NextObserver<T> {
  static of<T>(stream: Observable<T>): Recorder<T> {
    const recorder = new Recorder<T>()
    stream.subscribe(recorder)
    return recorder
  }
  readonly observed: T[] = []
  next(o: T) {
    this.observed.push(o)
  }
  get latest(): T {
    return this.observed[this.observed.length - 1]
  }
  get isEmpty(): boolean {
    return !this.observed.length
  }
}

const distinctUntilChangedCheckEmpty = <T>(): MonoTypeOperatorFunction<T> => {
  return distinctUntilChanged((a, b): boolean => {
    if (typeof a !== typeof b) {
      return false
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      return (a.length === 0 && b.length === 0) || a === b
    }
    return a && b ? (Object.getOwnPropertyNames(a).length === 0 && Object.getOwnPropertyNames(b).length === 0) || a === b : a === b
  })
}

class FeedEditChangeRecorder implements FeedEditStateObservers {

  state: Recorder<FeedEditState>
  originalFeed: Recorder<FeedExpanded | null>
  availableServices: Recorder<Service[]>
  selectedService: Recorder<Service | null>
  availableTopics: Recorder<FeedTopic[]>
  selectedTopic: Recorder<FeedTopic | null>
  fetchParameters: Recorder<any | null>
  itemPropertiesSchema: Recorder<any | null>
  feedMetaData: Recorder<FeedMetaData | null>
  preview: Recorder<FeedPreview | null>

  constructor(feedEdit: FeedEditService) {
    this.state = Recorder.of(feedEdit.state$)
    this.originalFeed = Recorder.of(feedEdit.state$.pipe(pluck('originalFeed'), distinctUntilChangedCheckEmpty()))
    this.availableServices = Recorder.of(feedEdit.state$.pipe(pluck('availableServices'), distinctUntilChangedCheckEmpty()))
    this.selectedService = Recorder.of(feedEdit.state$.pipe(pluck('selectedService'), distinctUntilChangedCheckEmpty()))
    this.availableTopics = Recorder.of(feedEdit.state$.pipe(pluck('availableTopics'), distinctUntilChangedCheckEmpty()))
    this.selectedTopic = Recorder.of(feedEdit.state$.pipe(pluck('selectedTopic'), distinctUntilChangedCheckEmpty()))
    this.fetchParameters = Recorder.of(feedEdit.state$.pipe(pluck('fetchParameters'), distinctUntilChangedCheckEmpty()))
    this.itemPropertiesSchema = Recorder.of(feedEdit.state$.pipe(pluck('itemPropertiesSchema'), distinctUntilChangedCheckEmpty()))
    this.feedMetaData = Recorder.of(feedEdit.state$.pipe(pluck('feedMetaData'), distinctUntilChangedCheckEmpty()))
    this.preview = Recorder.of(feedEdit.state$.pipe(pluck('preview'), distinctUntilChangedCheckEmpty()))
  }

  get eachObserved(): { [StateKey in keyof FeedEditState]: FeedEditState[StateKey][] } {
    return {
      originalFeed: this.originalFeed.observed,
      availableServices: this.availableServices.observed,
      selectedService: this.selectedService.observed,
      availableTopics: this.availableTopics.observed,
      selectedTopic: this.selectedTopic.observed,
      fetchParameters: this.fetchParameters.observed,
      itemPropertiesSchema: this.itemPropertiesSchema.observed,
      feedMetaData: this.feedMetaData.observed,
      preview: this.preview.observed
    }
  }
}

describe('FeedEditService', () => {

  let feedEdit: FeedEditService
  let stateChanges: FeedEditChangeRecorder
  let feedService: jasmine.SpyObj<FeedService>

  beforeEach(() => {
    feedService = jasmine.createSpyObj<FeedService>('SpyOfFeedService', [
      'fetchServices',
      'fetchTopics',
      'fetchFeed',
      'previewFeed',
      'createFeed',
      'updateFeed'
    ])
    feedEdit = new FeedEditService(feedService)
    stateChanges = new FeedEditChangeRecorder(feedEdit)
  })

  it('starts with empty state', async () => {

    expect(feedEdit.currentState).toEqual(emptyState)
    expect(stateChanges.state.latest).toEqual(emptyState)
    expect(stateChanges.state.observed).toEqual([ emptyState ])
  })

  describe('creating a new feed', () => {

    it('resets to initial state and fetches available services', () => {

      feedService.fetchServices.and.returnValue(of(services))

      expect(stateChanges.state.observed).toEqual([ emptyState ])

      feedEdit.newFeed()

      expect(stateChanges.state.observed).toEqual([
        emptyState,
        emptyState,
        { ...emptyState, availableServices: services }
      ])
      expect(feedEdit.currentState).toEqual({
        ...emptyState,
        availableServices: services
      })
    })

    it('selecting a service fetches topics for the selected service', () => {

      feedService.fetchServices.and.returnValue(of(services))
      feedService.fetchTopics.withArgs(services[1].id).and.returnValue(of(topicsForService[services[1].id]))

      expect(stateChanges.availableTopics.observed).toEqual([ [] ])

      feedEdit.newFeed()

      expect(stateChanges.availableTopics.observed).toEqual([ [] ])

      feedEdit.selectService(services[1].id)

      expect(stateChanges.availableTopics.observed).toEqual([ [], topicsForService[services[1].id] ])
      expect(feedEdit.currentState.availableTopics).toEqual(topicsForService[services[1].id])
    })

    it('cannot select a service not in available services', () => {

      feedService.fetchServices.and.returnValue(of(services))

      expect(feedEdit.currentState.availableServices).toEqual([])
      expect(stateChanges.selectedService.observed).toEqual([ null ])

      feedEdit.selectService('impossible')

      expect(feedEdit.currentState.selectedService).toBeNull()
      expect(stateChanges.state.observed).toEqual([ emptyState ])

      feedEdit.newFeed()

      expect(feedEdit.currentState.availableServices).toEqual(services)
      expect(stateChanges.state.observed).toEqual([ emptyState, emptyState, { ...emptyState, availableServices: services } ])

      feedEdit.selectService('derp')

      expect(feedEdit.currentState.selectedService).toBeNull()
      expect(stateChanges.state.observed).toEqual([ emptyState, emptyState, { ...emptyState, availableServices: services }])
      expect(stateChanges.selectedService.observed).toEqual([ null ])
    })

    it('populates topic meta-data from selected topic', () => {

      const service = services[0]
      const topics = topicsForService[service.id]
      const topic = topics[1]
      feedService.fetchServices.and.returnValue(of(services))
      feedService.fetchTopics.withArgs(service.id).and.returnValue(of(topics))

      feedEdit.newFeed()
      feedEdit.selectService(service.id)
      feedEdit.selectTopic(topic.id)

      expect(feedEdit.currentState).toEqual(<FeedEditState>{
        originalFeed: null,
        availableServices: services,
        selectedService: service,
        availableTopics: topics,
        selectedTopic: topic,
        fetchParameters: null,
        itemPropertiesSchema: null,
        feedMetaData: null,
        preview: null
      })
      expect(stateChanges.selectedTopic.latest).toEqual(topic)
    })

    it('resets the fetch parameters, item properties schema, feed meta-data, and preview when the selected topic changes', () => {

      const service = services[0]
      const topics = topicsForService[service.id]
      const fetchParameters: any = { resetMe: true }
      const feedMetaData: FeedMetaData = {
        title: 'Change the Topic'
      }
      feedService.fetchServices.and.returnValue(of(services))
      feedService.fetchTopics.withArgs(service.id).and.returnValue(of(topics))
      feedService.previewFeed.and.returnValue(of(emptyPreview))

      feedEdit.newFeed()
      feedEdit.selectService(service.id)
      feedEdit.selectTopic(topics[0].id)
      feedEdit.fetchParametersChanged(fetchParameters)
      feedEdit.feedMetaDataChanged(feedMetaData)
      feedEdit.itemPropertiesSchemaChanged({
        properties: {
          prop1: {
            type: 'string',
            title: 'Prop 1'
          }
        }
      })

      expect(feedEdit.currentState).toEqual(<FeedEditState>{
        availableServices: services,
        selectedService: service,
        availableTopics: topics,
        selectedTopic: topics[0],
        fetchParameters,
        feedMetaData,
        itemPropertiesSchema: {
          properties: {
            prop1: {
              type: 'string',
              title: 'Prop 1'
            }
          }
        },
        originalFeed: null,
        preview: emptyPreview
      })

      feedEdit.selectTopic(topics[1].id)

      expect(feedEdit.currentState).toEqual(<FeedEditState>{
        availableServices: services,
        selectedService: service,
        availableTopics: topics,
        selectedTopic: topics[1],
        itemPropertiesSchema: null,
        fetchParameters: null,
        feedMetaData: null,
        originalFeed: null,
        preview: null
      })
    })

    it('resets everything when the selected service changes', () => {

      feedService.fetchServices.and.returnValue(of(services))
      feedService.fetchTopics.withArgs(services[0].id).and.returnValue(of(topicsForService[services[0].id]))
      feedService.fetchTopics.withArgs(services[1].id).and.returnValue(of(topicsForService[services[1].id]))
      feedService.previewFeed.and.returnValue(of(emptyPreview))

      const stateBeforeChange: FeedEditState = {
        availableServices: services,
        selectedService: services[0],
        availableTopics: topicsForService[services[0].id],
        selectedTopic: topicsForService[services[0].id][0],
        fetchParameters: { firstService: true },
        itemPropertiesSchema: { properties: { test: { type: 'boolean', title: 'Test' }}},
        feedMetaData: { title: 'Test', itemPrimaryProperty: 'test' },
        originalFeed: null,
        preview: emptyPreview
      }

      feedEdit.newFeed()
      feedEdit.selectService(stateBeforeChange.selectedService.id)
      feedEdit.selectTopic(stateBeforeChange.selectedTopic.id)
      feedEdit.fetchParametersChanged(stateBeforeChange.fetchParameters)
      feedEdit.itemPropertiesSchemaChanged(stateBeforeChange.itemPropertiesSchema)
      feedEdit.feedMetaDataChanged(stateBeforeChange.feedMetaData)

      expect(feedEdit.currentState).toEqual(stateBeforeChange)

      feedEdit.selectService(services[1].id)

      const stateAfterChange: FeedEditState = {
        ...emptyState,
        availableServices: services,
        selectedService: services[1],
        availableTopics: topicsForService[services[1].id]
      }
      expect(feedEdit.currentState).toEqual(stateAfterChange)
    })

    it('does nothing when selecting an invalid topic', () => {
      // TODO: this might not be right. should the observable dispatch an error?

      feedService.fetchServices.and.returnValue(of(services))
      feedService.fetchTopics.withArgs(services[0].id).and.returnValue(of(topicsForService[services[0].id]))

      feedEdit.newFeed()
      feedEdit.selectService(services[0].id)

      const changes: FeedEditState[] = [
        emptyState,
        emptyState,
        {
          ...emptyState,
          availableServices: services
        },
        {
          ...emptyState,
          availableServices: services,
          selectedService: services[0]
        },
        {
          ...emptyState,
          availableServices: services,
          selectedService: services[0],
          availableTopics: topicsForService[services[0].id]
        }
      ]

      expect(stateChanges.state.observed).toEqual(changes)

      const invalidTopicId = topicsForService[services[0].id][0].id + String(Date.now())
      feedEdit.selectTopic(invalidTopicId)

      expect(stateChanges.state.observed).toEqual(changes)
    })

    it('initiating a new create process resets everything after values changed', () => {

      feedService.fetchServices.and.returnValue(of(services))
      feedService.fetchTopics.withArgs(services[0].id).and.returnValue(of(topicsForService[services[0].id]))
      feedService.fetchTopics.withArgs(services[1].id).and.returnValue(of(topicsForService[services[1].id]))
      feedService.previewFeed.and.returnValue(of(emptyPreview))

      const stateBefore: FeedEditState = {
        availableServices: services,
        selectedService: services[0],
        availableTopics: topicsForService[services[0].id],
        selectedTopic: topicsForService[services[0].id][0],
        fetchParameters: { firstService: true },
        itemPropertiesSchema: { properties: { test: { type: 'boolean', title: 'Test' }}},
        feedMetaData: { title: 'Test', itemPrimaryProperty: 'test' },
        originalFeed: null,
        preview: emptyPreview
      }

      feedEdit.newFeed()
      feedEdit.selectService(stateBefore.selectedService.id)
      feedEdit.selectTopic(stateBefore.selectedTopic.id)
      feedEdit.fetchParametersChanged(stateBefore.fetchParameters)
      feedEdit.itemPropertiesSchemaChanged(stateBefore.itemPropertiesSchema)
      feedEdit.feedMetaDataChanged(stateBefore.feedMetaData)

      expect(feedEdit.currentState).toEqual(stateBefore)

      feedEdit.newFeed()

      const stateAfterChange: FeedEditState = {
        ...emptyState,
        availableServices: services
      }
      expect(feedEdit.currentState).toEqual(stateAfterChange)
    })

    it('refreshes services after creating a service and selects the created service', () => {

      const created: Service = {
        id: 'created',
        serviceType: 'test_type',
        title: 'Created Service',
        summary: 'For new feed',
        config: { test: true }
      }
      const createdTopics: FeedTopic[] = [
        {
          id: 'createdtopic1',
          title: 'Topic of New Service'
        }
      ]
      feedService.fetchServices.and.returnValues(
        of(services),
        of([ ...services, created ])
      )
      feedService.fetchTopics.withArgs(created.id).and.returnValue(of(createdTopics))
      feedEdit.newFeed()
      feedEdit.serviceCreated(created)

      const expectedStates: FeedEditState[] = [
        emptyState,
        emptyState,
        {
          ...emptyState,
          availableServices: services
        },
        emptyState,
        {
          ...emptyState,
          availableServices: [ ...services, created ],
          selectedService: created
        },
        {
          ...emptyState,
          availableServices: [ ...services, created ],
          selectedService: created,
          availableTopics: createdTopics
        },
      ]
      expect(stateChanges.state.observed).toEqual(expectedStates)
      expect(feedEdit.currentState).toEqual(expectedStates[expectedStates.length - 1])
    })
  })

  describe('editing an existing feed', () => {

    it('resets first, then fetches the feed and intializes editing state', () => {

      const feedId = 'feed1'
      const fetchedFeed: Readonly<FeedExpanded> = Object.freeze({
        id: feedId,
        service: {
          id: 'service1',
          title: 'Service 1',
          summary: 'Made for testing',
          serviceType: 'servicetype1',
          config: null
        },
        topic: {
          id: 'topic1',
          title: 'Topic 1'
        },
        title: 'Feed of Topic 1',
        summary: 'Items from level 10 to 25',
        itemPrimaryProperty: 'what',
        itemPropertiesSchema: {
          properties: {
            what: 'string',
            level: 'number'
          }
        },
        constantParams: {
          levelBetween: [ 10, 25 ]
        }
      })
      feedService.fetchFeed.withArgs(feedId).and.returnValue(of(fetchedFeed))
      feedService.previewFeed.and.returnValue(of(emptyPreview))

      feedEdit.editFeed(feedId)

      const expectedState: FeedEditState = {
        availableServices: [ fetchedFeed.service ],
        selectedService: fetchedFeed.service,
        availableTopics: [ fetchedFeed.topic ],
        selectedTopic: fetchedFeed.topic,
        originalFeed: fetchedFeed,
        fetchParameters: fetchedFeed.constantParams,
        itemPropertiesSchema: fetchedFeed.itemPropertiesSchema,
        feedMetaData: feedMetaDataLean(fetchedFeed),
        preview: emptyPreview
      }
      expect(feedEdit.currentState).toEqual(expectedState)
      expect(feedService.fetchFeed).toHaveBeenCalledWith(feedId)
      expect(stateChanges.state.observed).toEqual([
        emptyState,
        emptyState,
        {
          ...expectedState,
          preview: null
        },
        expectedState
      ])
    })

    it('does not allow selecting a service or topic', async () => {

      const feed: FeedExpanded = {
        id: 'feed1',
        title: 'Service is Set',
        summary: 'No selecting a service for a saved feed',
        service: {
          id: 'service1',
          title: 'Test Service',
          summary: 'Testing',
          config: null,
          serviceType: 'servicetype1'
        },
        topic: {
          id: 'topic1',
          title: 'Topic 1',
        }
      }
      feedService.fetchFeed.withArgs(feed.id).and.returnValue(of(feed))
      feedService.previewFeed.and.returnValue(of(emptyPreview))

      feedEdit.editFeed(feed.id)

      const statesBeforeSelect: FeedEditState[] = [
        emptyState,
        emptyState,
        {
          ...emptyState,
          originalFeed: feed,
          availableServices: [ feed.service ],
          selectedService: feed.service,
          availableTopics: [ feed.topic ],
          selectedTopic: feed.topic,
          feedMetaData: feedMetaDataLean(feed)
        },
        {
          ...emptyState,
          originalFeed: feed,
          availableServices: [ feed.service ],
          selectedService: feed.service,
          availableTopics: [ feed.topic ],
          selectedTopic: feed.topic,
          feedMetaData: feedMetaDataLean(feed),
          preview: emptyPreview,
        }
      ]

      expect(feedEdit.currentState).toEqual(statesBeforeSelect[3])
      expect(stateChanges.state.observed).toEqual(statesBeforeSelect)

      feedEdit.selectService('nope')
      feedEdit.selectService(feed.service.id)
      feedEdit.selectTopic('nope')
      feedEdit.selectTopic(feed.topic.id)

      expect(feedEdit.currentState).toEqual(statesBeforeSelect[3])
      expect(stateChanges.state.observed).toEqual(statesBeforeSelect)
    })

    it('does nothing after creating a new service', () => {

      const feed: FeedExpanded = {
        id: 'feed1',
        title: 'Service is Set',
        summary: 'No selecting a service for a saved feed',
        service: {
          id: 'service1',
          title: 'Test Service',
          summary: 'Testing',
          config: null,
          serviceType: 'servicetype1'
        },
        topic: {
          id: 'topic1',
          title: 'Topic 1',
        }
      }
      feedService.fetchFeed.withArgs(feed.id).and.returnValue(of(feed))
      feedService.previewFeed.and.returnValue(of(emptyPreview))

      feedEdit.editFeed(feed.id)

      const statesBeforeNewService: FeedEditState[] = [
        emptyState,
        emptyState,
        {
          ...emptyState,
          originalFeed: feed,
          availableServices: [ feed.service ],
          selectedService: feed.service,
          availableTopics: [ feed.topic ],
          selectedTopic: feed.topic,
          feedMetaData: feedMetaDataLean(feed)
        },
        {
          ...emptyState,
          originalFeed: feed,
          availableServices: [ feed.service ],
          selectedService: feed.service,
          availableTopics: [ feed.topic ],
          selectedTopic: feed.topic,
          feedMetaData: feedMetaDataLean(feed),
          preview: emptyPreview,
        }
      ]

      expect(feedEdit.currentState).toEqual(statesBeforeNewService[3])
      expect(stateChanges.state.observed).toEqual(statesBeforeNewService)

      feedEdit.serviceCreated({
        id: 'newservice',
        serviceType: 'testtype',
        title: 'Not Now',
        summary: 'Ignore this service',
        config: {
          ignore: true
        }
      })

      expect(feedEdit.currentState).toEqual(statesBeforeNewService[3])
      expect(stateChanges.state.observed).toEqual(statesBeforeNewService)
    })
  })

  describe('changing the feed meta-data', () => {

    const previewWithoutContent: FeedPreview = {
      feed: emptyPreview.feed
    }
    beforeEach(() => {
      feedService.fetchServices.and.returnValue(of(services))
      feedService.fetchTopics.and.callFake((serviceId: string) => {
        return of(topicsForService[serviceId])
      })
      feedService.previewFeed
        .withArgs(jasmine.anything(), jasmine.anything(), jasmine.anything(), { skipContentFetch: true })
        .and.returnValue(of(previewWithoutContent))
    })

    it('allows setting empty meta-data', () => {

      const service = services[0]
      const topic = topicsForService[service.id][0]

      feedEdit.newFeed()
      feedEdit.selectService(service.id)
      feedEdit.selectTopic(topic.id)

      expect(stateChanges.feedMetaData.observed).toEqual([ null ])

      feedEdit.feedMetaDataChanged({})

      expect(stateChanges.feedMetaData.observed).toEqual([ null, {} ])
    })

    it('sets meta-data to the given value', () => {

      const service = services[0]
      const topic = topicsForService[service.id][0]
      feedEdit.newFeed()
      feedEdit.selectService(service.id)
      feedEdit.selectTopic(topic.id)

      expect(feedEdit.currentState.feedMetaData).toBeNull()

      feedEdit.feedMetaDataChanged({ title: 'Changed Title' })

      expect(feedEdit.currentState.feedMetaData).toEqual({ title: 'Changed Title' })
      expect(stateChanges.feedMetaData.observed).toEqual([
        null,
        { title: 'Changed Title' }
      ])
    })

    it('is not allowed with no topic selected', () => {

      feedEdit.newFeed()
      feedEdit.selectService(services[0].id)

      expect(feedEdit.currentState.feedMetaData).toBeNull()

      feedEdit.feedMetaDataChanged({ title: 'Select Topic First' })

      expect(feedEdit.currentState.feedMetaData).toBeNull()
      expect(stateChanges.feedMetaData.observed).toEqual([ null ])
      expect(feedService.previewFeed).toHaveBeenCalledTimes(0)
    })

    it('refreshes preview without fetching content', () => {

      const service = services[1]
      const topic = topicsForService[service.id][0]
      feedEdit.newFeed()
      feedEdit.selectService(service.id)
      feedEdit.selectTopic(topic.id)
      feedEdit.feedMetaDataChanged({ title: 'Preview Without Fetch' })

      const previewPost = feedPostFromEditState(feedEdit.currentState)
      expect(feedService.previewFeed).toHaveBeenCalledWith(service.id, topic.id, _.omit(previewPost, 'service', 'topic'), { skipContentFetch: true })
      expect(feedEdit.currentState.preview).toEqual(previewWithoutContent)
      expect(stateChanges.preview.observed).toEqual([ null, previewWithoutContent ])
    })

    it('retains content of previously fetched preview but updates preview feed', () => {

      const service = services[1]
      const topic = topicsForService[service.id][0]
      feedEdit.newFeed()
      feedEdit.selectService(service.id)
      feedEdit.selectTopic(topic.id)

      const previewWithContent: FeedPreview = {
        feed: { ...previewWithoutContent.feed, title: 'Has Some Content' },
        content: {
          feed: 'preview',
          items: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: null,
                properties: {
                  retained: true
                }
              }
            ]
          }
        }
      }
      feedService.previewFeed.withArgs(service.id, topic.id, jasmine.anything(), { skipContentFetch: false }).and.returnValue(of(previewWithContent))

      feedEdit.fetchParametersChanged({ returnContent: true })

      expect(feedEdit.currentState.preview).toEqual(previewWithContent)
      expect(feedEdit.currentState.preview.feed.title).toEqual('Has Some Content')

      feedEdit.feedMetaDataChanged({ title: 'Retain Content' })

      expect(feedService.previewFeed).toHaveBeenCalledWith(service.id, topic.id, jasmine.anything(), { skipContentFetch: true })
      expect(feedEdit.currentState.preview).toEqual({
        feed: previewWithoutContent.feed,
        content: previewWithContent.content
      })
      expect(stateChanges.preview.observed).toEqual([
        null,
        previewWithContent,
        {
          feed: previewWithoutContent.feed,
          content: previewWithContent.content
        }
      ])
    })

    it('removes null values from change', () => {

      // TODO: when strict null checks are enabled in tsconfig.json, this should not compile
      const service = services[1]
      const topic = topicsForService[service.id][0]
      feedEdit.newFeed()
      feedEdit.selectService(service.id)
      feedEdit.selectTopic(topic.id)
      feedEdit.feedMetaDataChanged({ title: null, summary: null, itemPrimaryProperty: null })

      expect(feedEdit.currentState.feedMetaData).toEqual(feedMetaDataLean({ title: null, summary: null, itemPrimaryProperty: null }))
      expect(stateChanges.feedMetaData.observed).toEqual([ null, {} ])
    })
  })

  describe('changing the fetch parameters', () => {

    beforeEach(() => {
      feedService.fetchServices.and.returnValue(of(services))
      feedService.fetchTopics.and.callFake((serviceId: string) => {
        return of(topicsForService[serviceId])
      })
      feedService.previewFeed.and.returnValue(of(emptyPreview))
    })

    it('is not allowed with no topic selected', () => {

      feedEdit.fetchParametersChanged({ ignore: true })

      expect(feedEdit.currentState.fetchParameters).toBeNull()
      expect(stateChanges.fetchParameters.observed).toEqual([ null ])
      expect(feedService.previewFeed).toHaveBeenCalledTimes(0)

      feedEdit.newFeed()
      feedEdit.fetchParametersChanged({ ignore: true })

      expect(feedEdit.currentState.fetchParameters).toBeNull()
      expect(stateChanges.fetchParameters.observed).toEqual([ null ])
      expect(feedService.previewFeed).toHaveBeenCalledTimes(0)

      const service = services[1]
      feedEdit.selectService(service.id)

      expect(feedEdit.currentState.fetchParameters).toBeNull()
      expect(stateChanges.fetchParameters.observed).toEqual([ null ])
      expect(feedService.previewFeed).toHaveBeenCalledTimes(0)
    })

    it('refreshes preview fetching new content', () => {

      const service = services[1]
      const topic = topicsForService[service.id][0]
      feedEdit.newFeed()
      feedEdit.selectService(service.id)
      feedEdit.selectTopic(topic.id)

      expect(feedEdit.currentState.fetchParameters).toBeNull()

      feedEdit.fetchParametersChanged({ test: true })

      expect(feedEdit.currentState).toEqual(jasmine.objectContaining({
        selectedTopic: topic,
        fetchParameters: { test: true },
        preview: emptyPreview
      }))
      expect(stateChanges.fetchParameters.observed).toEqual([ null, { test: true } ])
      expect(stateChanges.preview.observed).toEqual([ null, emptyPreview ])
      expect(feedService.previewFeed).toHaveBeenCalledWith(service.id, topic.id,
        _.omit(feedPostFromEditState(feedEdit.currentState), 'service', 'topic'),
        { skipContentFetch: false })
    })

    it('allows empty parameters', () => {

      const service = services[1]
      const topic = topicsForService[service.id][0]
      feedEdit.newFeed()
      feedEdit.selectService(service.id)
      feedEdit.selectTopic(topic.id)

      expect(feedEdit.currentState.fetchParameters).toBeNull()

      feedEdit.fetchParametersChanged({})

      expect(feedEdit.currentState).toEqual(jasmine.objectContaining({
        selectedTopic: topic,
        fetchParameters: {},
        preview: emptyPreview
      }))
      expect(stateChanges.fetchParameters.observed).toEqual([ null, {} ])
      expect(stateChanges.preview.observed).toEqual([ null, emptyPreview ])
      expect(feedService.previewFeed).toHaveBeenCalledWith(service.id, topic.id,
        _.omit(feedPostFromEditState(feedEdit.currentState), 'service', 'topic'),
        { skipContentFetch: false })
    })

    it('does not refresh preview it the parameters are identical', () => {

      const service = services[1]
      const topic = topicsForService[service.id][0]
      feedEdit.newFeed()
      feedEdit.selectService(service.id)
      feedEdit.selectTopic(topic.id)

      expect(feedEdit.currentState.fetchParameters).toBe(null)

      feedEdit.fetchParametersChanged(null)

      expect(stateChanges.fetchParameters.observed).toEqual([ null ])
      expect(feedService.previewFeed).not.toHaveBeenCalled()
    })

    it('resets preview content without fetching new preview when fetch parameters change to null', () => {

      const service = services[1]
      const topic = topicsForService[service.id][0]
      feedEdit.newFeed()
      feedEdit.selectService(service.id)
      feedEdit.selectTopic(topic.id)

      expect(feedEdit.currentState.fetchParameters).toBeNull()

      feedEdit.fetchParametersChanged({})

      expect(feedEdit.currentState).toEqual(jasmine.objectContaining({
        fetchParameters: {},
        preview: emptyPreview
      }))
      expect(stateChanges.fetchParameters.observed).toEqual([ null, {} ])
      expect(stateChanges.preview.observed).toEqual([ null, emptyPreview ])
      expect(feedService.previewFeed).toHaveBeenCalledWith(service.id, topic.id, jasmine.anything(), { skipContentFetch: false })

      feedEdit.fetchParametersChanged(null)

      const previewWithEmptyContent: FeedPreview = {
        ...emptyPreview,
        content: null
      }
      expect(feedEdit.currentState).toEqual(jasmine.objectContaining({
        fetchParameters: null,
        preview: previewWithEmptyContent
      }))
      expect(stateChanges.fetchParameters.observed).toEqual([ null, {}, null ])
      expect(stateChanges.preview.observed).toEqual([ null, emptyPreview, previewWithEmptyContent ])
      expect(feedService.previewFeed).toHaveBeenCalledTimes(1)
    })
  })

  describe('saving the feed', () => {

    beforeEach(() => {
      feedService.fetchServices.and.returnValue(of(services))
      feedService.fetchTopics.and.callFake(serviceId => of(topicsForService[serviceId] || []))
      feedService.previewFeed.and.returnValue(of(emptyPreview))
    })

    describe('after initiating new feed', () => {

      it('sends a create feed request', () => {

        const service = services[0]
        const topic = topicsForService[service.id][0]
        const created: FeedExpanded = {
          id: 'feed1',
          service,
          topic,
          title: 'Create Test'
        }
        feedEdit.newFeed()
        feedEdit.selectService(services[0].id)
        feedEdit.selectTopic(topic.id)
        feedService.createFeed.and.returnValue(of(created))

        let saveResult: FeedExpanded
        feedEdit.saveFeed().subscribe(x => {
          saveResult = x
        })

        expect(saveResult).toEqual(created)
        const expectedRequest: Parameters<FeedService['createFeed']> = [
          service.id,
          topic.id,
          { service: service.id, topic: topic.id }
        ]
        expect(feedService.createFeed).toHaveBeenCalledWith(...expectedRequest)
      })

      it('adds all parameters to the create request', () => {

        const service = services[0]
        const topic = topicsForService[service.id][0]
        const created: FeedExpanded = {
          id: 'feed1',
          service,
          topic,
          title: 'Create Test'
        }
        const updateFrequencySeconds = Math.floor(Math.random() * 1000)
        feedEdit.newFeed()
        feedEdit.selectService(services[0].id)
        feedEdit.selectTopic(topic.id)
        feedEdit.feedMetaDataChanged({
          title: 'Custom Title',
          summary: 'Custom summary',
          updateFrequencySeconds
        })
        feedEdit.itemPropertiesSchemaChanged({
          properties: {
            prop1: {
              title: 'Prop 1 ' + updateFrequencySeconds
            },
            prop2: {
              title: 'Prop 2 ' + updateFrequencySeconds
            }
          }
        })
        feedEdit.fetchParametersChanged({
          createTest: updateFrequencySeconds
        })
        const feedPost = feedPostFromEditState(feedEdit.currentState)
        feedService.createFeed.and.returnValue(of(created))

        let saveResult: FeedExpanded
        feedEdit.saveFeed().subscribe(x => {
          saveResult = x
        })

        expect(saveResult).toEqual(created)
        const expectedRequest: Parameters<FeedService['createFeed']> = [
          service.id,
          topic.id,
          feedPost
        ]
        expect(feedService.createFeed).toHaveBeenCalledWith(...expectedRequest)
      })

      it('resets the edit state after successful save', () => {

        const service = services[0]
        const topic = topicsForService[service.id][0]
        const created: FeedExpanded = {
          id: String(Date.now()),
          service,
          topic,
          title: 'Original Updated'
        }
        feedService.createFeed.and.returnValue(of(created))

        feedEdit.newFeed()
        feedEdit.selectService(services[0].id)
        feedEdit.selectTopic(topic.id)
        feedEdit.saveFeed().subscribe(() => {})

        expect(feedEdit.currentState).toEqual(emptyState)
      })

      it('preserves edit state after save error', () => {

        const service = services[0]
        const topic = topicsForService[service.id][0]
        feedService.createFeed.and.returnValue(throwError(new Error('oh no')))

        feedEdit.newFeed()
        feedEdit.selectService(services[0].id)
        feedEdit.selectTopic(topic.id)
        feedEdit.fetchParametersChanged({ retainState: true })
        const stateBeforeSave = _.cloneDeep(feedEdit.currentState)
        feedEdit.saveFeed().subscribe({ error: () => {} })

        expect(stateBeforeSave).toEqual(jasmine.objectContaining({
          originalFeed: null,
          fetchParameters: { retainState: true }
        }))
        expect(feedEdit.currentState).toEqual(stateBeforeSave)
      })
    })

    describe('after initiating feed edit', () => {

      it('sends an update feed request', () => {

        const service = services[0]
        const topic = topicsForService[service.id][0]
        const original: FeedExpanded = {
          id: String(Date.now()),
          service,
          topic,
          title: 'Original'
        }
        const updated: FeedExpanded = {
          id: original.id,
          service,
          topic,
          title: 'Original Updated'
        }
        feedService.fetchFeed.withArgs(original.id).and.returnValue(of(original))
        feedService.updateFeed.and.returnValue(of(updated))

        feedEdit.editFeed(original.id)

        let saveResult: FeedExpanded
        feedEdit.saveFeed().subscribe(x => {
          saveResult = x
        })

        expect(saveResult).toEqual(updated)
        const expectedRequest: Parameters<FeedService['updateFeed']> = [
          { ...original, service: service.id, topic: topic.id }
        ]
        expect(feedService.updateFeed).toHaveBeenCalledWith(...expectedRequest)
      })

      it('adds all parameters to the update request', () => {

        const service = services[0]
        const topic = topicsForService[service.id][0]
        const original: FeedExpanded = {
          id: String(Date.now()),
          service,
          topic,
          title: 'Original'
        }
        const updated: FeedExpanded = {
          id: original.id,
          service,
          topic,
          title: 'Original Updated'
        }
        feedService.fetchFeed.withArgs(original.id).and.returnValue(of(original))
        feedService.updateFeed.and.returnValue(of(updated))

        feedEdit.editFeed(original.id)
        const fetchParameters = { updateTest: true }
        feedEdit.fetchParametersChanged(fetchParameters)
        const itemPropertiesSchema = {
          properties: {
            updatedPrimary: { title: 'Updated Primary' }
          }
        }
        feedEdit.itemPropertiesSchemaChanged(itemPropertiesSchema)
        const metaData: FeedMetaData = {
          title: 'Original Updated',
          itemPrimaryProperty: 'updatedPrimary',
          itemsHaveIdentity: true,
          updateFrequencySeconds: Math.random()
        }
        feedEdit.feedMetaDataChanged(metaData)

        const update = feedPostFromEditState(feedEdit.currentState)
        expect(update).toEqual(jasmine.objectContaining({
          id: original.id,
          constantParams: fetchParameters,
          itemPropertiesSchema,
          ...metaData,
        }))

        const expectedRequest: Parameters<FeedService['updateFeed']> = [
          { ...update, id: original.id, service: service.id, topic: topic.id }
        ]
        let saveResult: FeedExpanded
        feedEdit.saveFeed().subscribe(x => {
          saveResult = x
        })

        expect(saveResult).toEqual(updated)
        expect(feedService.updateFeed).toHaveBeenCalledWith(...expectedRequest)
      })

      it('resets the edit state after successful save', () => {

        const service = services[0]
        const topic = topicsForService[service.id][0]
        const original: FeedExpanded = {
          id: String(Date.now()),
          service,
          topic,
          title: 'Original'
        }
        const updated: FeedExpanded = {
          id: original.id,
          service,
          topic,
          title: 'Original Updated'
        }
        feedService.fetchFeed.withArgs(original.id).and.returnValue(of(original))
        feedService.updateFeed.and.returnValue(of(updated))

        feedEdit.editFeed(original.id)
        feedEdit.saveFeed().subscribe(() => {})

        expect(feedEdit.currentState).toEqual(emptyState)
      })

      it('preserves edit state after save error', () => {

        const service = services[0]
        const topic = topicsForService[service.id][0]
        const original: FeedExpanded = {
          id: String(Date.now()),
          service,
          topic,
          title: 'Original'
        }
        feedService.fetchFeed.withArgs(original.id).and.returnValue(of(original))
        feedService.updateFeed.and.returnValue(throwError(new Error('oh no')))

        feedEdit.editFeed(original.id)
        feedEdit.fetchParametersChanged({ retainState: true })
        const stateBeforeSave = _.cloneDeep(feedEdit.currentState)
        feedEdit.saveFeed().subscribe({ error: () => {} })

        expect(stateBeforeSave).toEqual(jasmine.objectContaining({
          originalFeed: original,
          fetchParameters: { retainState: true }
        }))
        expect(feedEdit.currentState).toEqual(stateBeforeSave)
      })
    })

    it('emits an error without a selected service', () => {

      let error: Error | null
      feedEdit.saveFeed().subscribe({
        next: () => {
          fail('unexpected observed value')
        },
        error: e => {
          error = e
        }
      })

      expect(error.message).toEqual('no service selected')
      expect(feedService.createFeed).not.toHaveBeenCalled()
      expect(feedService.updateFeed).not.toHaveBeenCalled()

      error = null
      feedEdit.newFeed()
      feedEdit.saveFeed().subscribe({
        next: () => {
          fail('unexpected observed value')
        },
        error: e => {
          error = e
        }
      })

      expect(error.message).toEqual('no service selected')
      expect(feedService.createFeed).not.toHaveBeenCalled()
      expect(feedService.updateFeed).not.toHaveBeenCalled()
    })

    it('does nothing without a selected topic', () => {

      let error: Error | null = null
      feedEdit.newFeed()
      feedEdit.selectService(services[0].id)
      feedEdit.saveFeed().subscribe({
        next: () => {
          fail('unexpected observed value')
        },
        error: e => {
          error = e
        }
      })

      expect(error.message).toEqual('no topic selected')
      expect(feedService.createFeed).not.toHaveBeenCalled()
      expect(feedService.updateFeed).not.toHaveBeenCalled()
    })
  })
})