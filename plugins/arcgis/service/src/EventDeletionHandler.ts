import { MageEventAttrs } from "@ngageoint/mage.service/lib/entities/events/entities.events";
import { FeatureLayerProcessor } from "./FeatureLayerProcessor";
import { QueryObjectResult } from "./types/QueryObjectResult";
import { ArcGISPluginConfig } from "./types/ArcGISPluginConfig";

/**
 * Class that handles deleting observations from an arc server for any deleted events.
 */
export class EventDeletionHandler {

    /**
     * The current set of event ids.
     */
    private _currentEventIds: Map<string, string>;

    /**
     * Used to log messages.
     */
    private _console: Console;

    /**
     * Contains the name of the id field.
     */
    private _config: ArcGISPluginConfig;

    /**
     * Constructor.
     * @param {Console} console Used to log messages.
     * @param {ArcGISPluginConfig} config The plugin configuration.
     */
    constructor(console: Console, config: ArcGISPluginConfig) {
        this._currentEventIds = new Map<string, string>();
        this._console = console;
        this._config = config;
    }

    public updateConfig(newConfig: ArcGISPluginConfig): void {
        this._config = newConfig;
    }

    /**
     * 
     * @param {MageEventAttrs[]} activeEvents The current set of active events.
     * @param {FeatureLayerProcessor[]} layerProcessors The different layer processors currently syncing arc layers with mage data.
     * @param {boolean} firstRun True if this is the first run at startup.
     */
    checkForEventDeletion(activeEvents: MageEventAttrs[], layerProcessors: FeatureLayerProcessor[], firstRun: boolean) {
        if (firstRun) {
            for (const activeEvent of activeEvents) {
                this._currentEventIds.set(activeEvent.id.toString(), activeEvent.name);
            }

            for (const layerProcessor of layerProcessors) {
                const response: (result: QueryObjectResult) => void = (result) => { this.figureOutAllEventsOnArc(layerProcessor, result); };
                if (this._config.eventIdField == null) {
                    void layerProcessor.featureQuerier.queryObservations(response, [this._config.observationIdField], false);
                } else {
                    void layerProcessor.featureQuerier.queryDistinct(response, this._config.eventIdField);
                }
            }
        } else {
            this._console.log('Checking for event deletions');
            const deletedEvents = new Map<string, string>();
            this._currentEventIds.forEach((eventName: string, eventId: string) => {
                deletedEvents.set(eventId, eventName);
            });

            for (const activeEvent of activeEvents) {
                deletedEvents.delete(activeEvent.id.toString());
            }

            if (deletedEvents.size > 0) {
                this._console.debug('Removing observations from ArcGIS layers for deleted events: '
                    + [...deletedEvents.keys()].join(","));
                deletedEvents.forEach((eventName: string, eventId: string) => {
                    for (const layerProcessor of layerProcessors) {
                        void layerProcessor.sender.sendDeleteEvent(eventId);
                    }
                    this._currentEventIds.delete(eventId);
                });
            } else {
                this._console.debug('No deleted events found');
            }

            for (const activeEvent of activeEvents) {
                this._currentEventIds.set(activeEvent.id.toString(), activeEvent.name);
            }
        }
    }

    /**
     * Called when the query is finished.  It goes through the results and gathers all event Ids currently stored
     * in the arc layer.  It then will remove any events from the arc layer that do not exist.
     * @param {FeatureLayerProcessor} layerProcessor The feature layer processor.
     * @param {QueryObjectResult} result The returned results.
     */
    figureOutAllEventsOnArc(layerProcessor: FeatureLayerProcessor, result: QueryObjectResult) {
        this._console.log('ArcGIS investigating all events for feature layer ' + layerProcessor.layerInfo.url);

        if (result.features != null) {
            const arcEventIds = new Set<string>();

            for (const feature of result.features) {
                if (this._config.eventIdField == null) {
                    const value = feature.attributes[this._config.observationIdField] as string;
                    const splitIds = value.split(this._config.idSeparator)
                    if (splitIds.length === 2) {
                        const eventId = splitIds[1];
                        arcEventIds.add(eventId);
                    }
                } else {
                    const value = feature.attributes[this._config.eventIdField] as string;
                    arcEventIds.add(value);
                }
            }

            this._currentEventIds.forEach((eventName: string, eventId: string) => {
                arcEventIds.delete(eventId);
            });

            for (const arcEventId of arcEventIds) {
                void layerProcessor.sender.sendDeleteEvent(arcEventId);
            }
        }
    }

}