import { expect } from 'chai'
import { EventEmitter } from 'events'
import sinon from 'sinon'
import uniqid from 'uniqid'
import { loadMageEventsHoooks } from '../../lib/main.impl/plugin_hooks/main.impl.plugin_hooks.events'
import { MageEventsPluginHooks } from '../../lib/plugins.api/plugins.api.events'
import { UserLocation, UserLocationDomainEventType, UserLocationSavedDomainEvent } from '../../lib/entities/locations/entities.locations'
import { Observation, ObservationDomainEventType, ObservationEmitted, ObservationSavedDomainEvent } from '../../lib/entities/observations/entities.observations'

describe('plugin mage events hooks', function() {

  const pluginId = '@testing/test1'

  const location: UserLocation = {
    type: 'Feature',
    eventId: 1,
    userId: uniqid(),
    geometry: { type: 'Point', coordinates: [1, 2] },
    properties: { timestamp: new Date() }
  }

  const locationSavedEvent: UserLocationSavedDomainEvent = Object.freeze({
    type: UserLocationDomainEventType.LocationSaved,
    locations: [location]
  })

  it('invokes the plugin onUserLocations hook when locations are added', async function() {
    const domainEvents = new EventEmitter()
    let received: UserLocationSavedDomainEvent | null = null
    const hooks: MageEventsPluginHooks = {
      mageEvent: {
        onUserLocations: (event) => { received = event }
      }
    }

    await loadMageEventsHoooks(pluginId, hooks, domainEvents)
    domainEvents.emit(UserLocationDomainEventType.LocationSaved, locationSavedEvent)

    expect(received).to.deep.equal(locationSavedEvent)
  })

  it('invokes the plugin onObservation hook when an observation is saved', async function() {
    const domainEvents = new EventEmitter()
    const observationSavedEvent: ObservationEmitted<ObservationSavedDomainEvent> = Object.freeze({
      type: ObservationDomainEventType.ObservationSaved,
      observation: { id: uniqid() } as unknown as Observation
    })
    let received: ObservationEmitted<ObservationSavedDomainEvent> | null = null
    const hooks: MageEventsPluginHooks = {
      mageEvent: {
        onObservation: (event) => { received = event }
      }
    }

    await loadMageEventsHoooks(pluginId, hooks, domainEvents)
    domainEvents.emit(ObservationDomainEventType.ObservationSaved, observationSavedEvent)

    expect(received).to.equal(observationSavedEvent)
  })

  it('does not throw and does not subscribe when mageEvent hooks are absent', async function() {
    const domainEvents = new EventEmitter()
    const hooks: MageEventsPluginHooks = {}

    await loadMageEventsHoooks(pluginId, hooks, domainEvents)

    expect(domainEvents.listenerCount(UserLocationDomainEventType.LocationSaved)).to.equal(0)
    expect(domainEvents.listenerCount(ObservationDomainEventType.ObservationSaved)).to.equal(0)
  })

  it('does not subscribe when onUserLocations and onObservation are not functions', async function() {
    const domainEvents = new EventEmitter()
    const hooks: MageEventsPluginHooks = {
      mageEvent: {}
    }

    await loadMageEventsHoooks(pluginId, hooks, domainEvents)

    expect(domainEvents.listenerCount(UserLocationDomainEventType.LocationSaved)).to.equal(0)
    expect(domainEvents.listenerCount(ObservationDomainEventType.ObservationSaved)).to.equal(0)
  })

  it('supports multiple plugins subscribing independently', async function() {
    const domainEvents = new EventEmitter()
    let receivedA: UserLocationSavedDomainEvent | null = null
    let receivedB: UserLocationSavedDomainEvent | null = null
    const hooksA: MageEventsPluginHooks = {
      mageEvent: { onUserLocations: (event) => { receivedA = event } }
    }
    const hooksB: MageEventsPluginHooks = {
      mageEvent: { onUserLocations: (event) => { receivedB = event } }
    }

    await loadMageEventsHoooks('@testing/plugin-a', hooksA, domainEvents)
    await loadMageEventsHoooks('@testing/plugin-b', hooksB, domainEvents)
    domainEvents.emit(UserLocationDomainEventType.LocationSaved, locationSavedEvent)

    expect(receivedA).to.deep.equal(locationSavedEvent)
    expect(receivedB).to.deep.equal(locationSavedEvent)
  })

  describe('when a plugin hook fails', function() {

    let consoleError: sinon.SinonStub

    beforeEach(function() {
      consoleError = sinon.stub(console, 'error')
    })

    afterEach(function() {
      consoleError.restore()
    })

    it('does not throw to the emitter and still invokes later listeners when a hook throws', async function() {
      const domainEvents = new EventEmitter()
      const failure = new Error('sync failure')
      const hooks: MageEventsPluginHooks = {
        mageEvent: {
          onUserLocations: () => { throw failure },
          onObservation: () => { throw failure }
        }
      }
      let laterLocationListenerCalled = false
      let laterObservationListenerCalled = false

      await loadMageEventsHoooks(pluginId, hooks, domainEvents)
      domainEvents.on(UserLocationDomainEventType.LocationSaved, () => { laterLocationListenerCalled = true })
      domainEvents.on(ObservationDomainEventType.ObservationSaved, () => { laterObservationListenerCalled = true })

      expect(() => domainEvents.emit(UserLocationDomainEventType.LocationSaved, locationSavedEvent)).not.to.throw()
      expect(() => domainEvents.emit(ObservationDomainEventType.ObservationSaved, { type: ObservationDomainEventType.ObservationSaved })).not.to.throw()
      await new Promise(resolve => setImmediate(resolve))

      expect(laterLocationListenerCalled).to.be.true
      expect(laterObservationListenerCalled).to.be.true
      expect(consoleError.callCount).to.equal(2)
      expect(consoleError.firstCall.args[0]).to.contain(pluginId)
      expect(consoleError.firstCall.args[1]).to.equal(failure)
    })

    it('catches and logs a rejected async hook', async function() {
      const domainEvents = new EventEmitter()
      const failure = new Error('async failure')
      const hooks: MageEventsPluginHooks = {
        mageEvent: {
          onObservation: async () => { throw failure }
        }
      }
      const unhandled = sinon.spy()
      process.on('unhandledRejection', unhandled)

      try {
        await loadMageEventsHoooks(pluginId, hooks, domainEvents)
        domainEvents.emit(ObservationDomainEventType.ObservationSaved, { type: ObservationDomainEventType.ObservationSaved })
        await new Promise(resolve => setImmediate(resolve))
      }
      finally {
        process.off('unhandledRejection', unhandled)
      }

      expect(unhandled.called).to.be.false
      expect(consoleError.callCount).to.equal(1)
      expect(consoleError.firstCall.args[0]).to.contain(pluginId)
      expect(consoleError.firstCall.args[1]).to.equal(failure)
    })
  })
})
