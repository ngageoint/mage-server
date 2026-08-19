import { expect } from 'chai'
import { EventEmitter } from 'events'
import uniqid from 'uniqid'
import { loadMageEventsHoooks } from '../../lib/main.impl/plugin_hooks/main.impl.plugin_hooks.events'
import { MageEventsPluginHooks } from '../../lib/plugins.api/plugins.api.events'
import { LocationsAddedEvent, UserLocation } from '../../lib/entities/locations/entities.locations'
import { MageEventAttrs } from '../../lib/entities/events/entities.events'
import { User } from '../../lib/entities/users/entities.users'

describe('plugin mage events hooks', function() {

  const pluginId = '@testing/test1'

  const location: UserLocation = {
    type: 'Feature',
    eventId: 1,
    userId: uniqid(),
    teamIds: [],
    geometry: { type: 'Point', coordinates: [1, 2] },
    properties: { timestamp: new Date() }
  }

  const user: User = {
    id: uniqid(),
    username: 'testuser',
    displayName: 'Test User',
    active: true,
    enabled: true,
    createdAt: new Date(),
    lastUpdated: new Date(),
    phones: [],
    roleId: uniqid()
  } as unknown as User

  const event: MageEventAttrs = {
    id: 1,
    name: 'Test Event',
    layerIds: [],
    feedIds: [],
    forms: [],
    style: {}
  } as unknown as MageEventAttrs

  it('invokes the plugin onUserLocations hook when locations are added', async function() {
    const domainEvents = new EventEmitter()
    let received: any[] = []
    const hooks: MageEventsPluginHooks = {
      mageEvent: {
        onUserLocations: (...args: any[]) => { received = args }
      }
    }

    await loadMageEventsHoooks(pluginId, hooks, domainEvents)
    domainEvents.emit(LocationsAddedEvent, [location], user, event)

    expect(received).to.deep.equal([[location], user, event])
  })

  it('does not throw and does not subscribe when mageEvent hooks are absent', async function() {
    const domainEvents = new EventEmitter()
    const hooks: MageEventsPluginHooks = {}

    await loadMageEventsHoooks(pluginId, hooks, domainEvents)

    expect(domainEvents.listenerCount(LocationsAddedEvent)).to.equal(0)
  })

  it('does not subscribe when onUserLocations is not a function', async function() {
    const domainEvents = new EventEmitter()
    const hooks: MageEventsPluginHooks = {
      mageEvent: {}
    }

    await loadMageEventsHoooks(pluginId, hooks, domainEvents)

    expect(domainEvents.listenerCount(LocationsAddedEvent)).to.equal(0)
  })

  it('supports multiple plugins subscribing independently', async function() {
    const domainEvents = new EventEmitter()
    let receivedA: any[] = []
    let receivedB: any[] = []
    const hooksA: MageEventsPluginHooks = {
      mageEvent: { onUserLocations: (...args: any[]) => { receivedA = args } }
    }
    const hooksB: MageEventsPluginHooks = {
      mageEvent: { onUserLocations: (...args: any[]) => { receivedB = args } }
    }

    await loadMageEventsHoooks('@testing/plugin-a', hooksA, domainEvents)
    await loadMageEventsHoooks('@testing/plugin-b', hooksB, domainEvents)
    domainEvents.emit(LocationsAddedEvent, [location], user, event)

    expect(receivedA).to.deep.equal([[location], user, event])
    expect(receivedB).to.deep.equal([[location], user, event])
  })
})
