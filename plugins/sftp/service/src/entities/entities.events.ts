import { MageEventAttrs } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { EventFilterMode, SFTPPluginConfig } from '../configuration/SFTPPluginConfig';

/**
 * Filters active events down to the ones the plugin should sync, applying
 * the configured eventFilterMode (all/include/exclude) against the events list.
 */
export function getEventsToSync(events: MageEventAttrs[], configuration: SFTPPluginConfig): MageEventAttrs[] {
  const filterMode = configuration.eventFilterMode || EventFilterMode.All
  if (filterMode === EventFilterMode.Include && configuration.events.length > 0) {
    return events.filter(mageEvent => configuration.events.includes(mageEvent.id))
  } else if (filterMode === EventFilterMode.Exclude && configuration.events.length > 0) {
    return events.filter(mageEvent => !configuration.events.includes(mageEvent.id))
  }
  return events
}
