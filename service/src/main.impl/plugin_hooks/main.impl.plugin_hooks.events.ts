import LocationApi from '../../api/location'
import { MageEventsPluginHooks } from '../../plugins.api/plugins.api.events'

export const loadMageEventsHoooks = async (moduleName: string, hooks: MageEventsPluginHooks) => {
  const { mageEvent } = hooks
  if (!mageEvent) {
    return
  }
  /*
   * TODO: until a more robust domain event architecture exists, use the legacy
   * location api mechanism
   */
  if (typeof mageEvent.onUserLocations === 'function') {
    const onLocations = mageEvent.onUserLocations
    LocationApi.on.add(onLocations)
  }
}