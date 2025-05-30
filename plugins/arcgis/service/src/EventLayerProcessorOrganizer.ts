import { MageEventAttrs } from "@ngageoint/mage.service/lib/entities/events/entities.events";
import { EventToLayerProcessor } from "./EventToLayerProcessor";
import { FeatureLayerProcessor } from "./FeatureLayerProcessor";

/**
 * Organizes the active events and groups them with the FeatureLayerProcessors that the events are configured to sync.
 */
export class EventLayerProcessorOrganizer {

    /**
     * Organizes the events with the layer processors they are configured to sync.
     * @param {MageEventAttrs[]} events The events to organize.
     * @param {FeatureLayerProcessor[]} layerProcessors The layer processors.
     * @returns {EventToLayerProcessor} An array of events mapped to their processors.
     */
    organize(events: MageEventAttrs[], layerProcessors: FeatureLayerProcessor[]): EventToLayerProcessor[] {
        const eventsAndProcessors = new Array<EventToLayerProcessor>;

        for (const event of events) {
            const syncProcessors = new Array<FeatureLayerProcessor>();
            for (const layerProcessor of layerProcessors) {
                if (layerProcessor.layerInfo.hasEvent(event.id)) {
                    syncProcessors.push(layerProcessor);
                }
            }

            if (syncProcessors.length > 0) {
                const eventToProcessors = new EventToLayerProcessor(event, syncProcessors);
                eventsAndProcessors.push(eventToProcessors);
            }
        }

        return eventsAndProcessors;
    }
}