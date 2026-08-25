import { expect } from 'chai'
import { EventEmitter } from 'events'
import uniqid from 'uniqid'
import { loadMageEventsHoooks } from '../../lib/main.impl/plugin_hooks/main.impl.plugin_hooks.events'
import { MageEventsPluginHooks } from '../../lib/plugins.api/plugins.api.events'
import { UserLocation, UserLocationDomainEventType, UserLocationSavedDomainEvent } from '../../lib/entities/locations/entities.locations'

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

  it('does not throw and does not subscribe when mageEvent hooks are absent', async function() {
    const domainEvents = new EventEmitter()
    const hooks: MageEventsPluginHooks = {}

    await loadMageEventsHoooks(pluginId, hooks, domainEvents)

    expect(domainEvents.listenerCount(UserLocationDomainEventType.LocationSaved)).to.equal(0)
  })

  it('does not subscribe when onUserLocations is not a function', async function() {
    const domainEvents = new EventEmitter()
    const hooks: MageEventsPluginHooks = {
      mageEvent: {}
    }

    await loadMageEventsHoooks(pluginId, hooks, domainEvents)

    expect(domainEvents.listenerCount(UserLocationDomainEventType.LocationSaved)).to.equal(0)
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
})
