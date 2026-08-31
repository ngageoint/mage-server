import { ArcGISPluginConfig } from "./types/ArcGISPluginConfig";
import { ArcObjects } from "./ArcObjects";
import { FeatureQuerier } from "./FeatureQuerier";
import { LayerInfo } from "./LayerInfo";
import { ObservationBins } from "./ObservationBins";
import { ObservationsSender } from "./ObservationsSender";
import { ArcGISIdentityManager } from "@esri/arcgis-rest-request";
import { QueryObjectResult } from "./types/QueryObjectResult";
/**
 * Processes new, updated, and deleted observations and sends the changes to a specific arc feature layer.
 */
export class FeatureLayerProcessor {

    /**
     * Information about the arc feature layer this class sends observations to.
     */
    layerInfo: LayerInfo;

    /**
     * Sends the observation adds or updates to the arc feature layer.
     */
    sender: ObservationsSender;

    /**
     * Performs queries for observations on this processor's feature layer.
     */
    featureQuerier: FeatureQuerier;

    /**
     * The last time we checked for new/modified observations.
     */
    lastTimeStamp: number = 0;

    /**
     * The number of existence queries we are still waiting for.
     */
    private _existenceQueryCounts: number = 0;

    /**
     * Contains the results from checking if an observation exists on the server.
     */
    private _pendingNewAndUpdates: ObservationBins;

    /**
     * The plugins configuration.
     */
    private _config: ArcGISPluginConfig;

    private _console: Console;

    /**
     * Creates a new instance of FeatureLayerProcessor.
     * @param {LayerInfo} layerInfo - Information about the ArcGIS feature layer this object sends observations to.
     * @param {ArcGISPluginConfig} config - Contains certain parameters that can be configured.
     * @param {ArcGISIdentityManager} identityManager - ArcGIS identity manager for authentication.
     * @param {Console} console - Used to log messages to the console.
     */
    constructor(layerInfo: LayerInfo, config: ArcGISPluginConfig, identityManager: ArcGISIdentityManager, console: Console) {
        this.layerInfo = layerInfo;
        this._config = config;
        this._console = console;
        this.featureQuerier = new FeatureQuerier(layerInfo, config, identityManager, console);
        this.sender = new ObservationsSender(layerInfo, config, identityManager, console);
        this._pendingNewAndUpdates = new ObservationBins;
    }

    /**
     * Indicates if this binner has pending updates still waiting to be processed.
     * @returns {boolean} True if it is still waiting for updates to be processed, false otherwise.
     */
    hasPendingUpdates(): boolean {
        return this._existenceQueryCounts > 0;
    }

    /**
     * Checks to see if there are any updates that need to be sent to the feature layer.
     */
    async processPendingUpdates() {
        const existingObsIds = await this.existingObservationIds();

        const newAndUpdates = new ObservationBins();
        for (let i = 0; i < this._pendingNewAndUpdates.adds.count(); i++) {
            if (!existingObsIds.has(this._pendingNewAndUpdates.adds.observations[i].id)) {
                newAndUpdates.adds.add(this._pendingNewAndUpdates.adds.observations[i]);
            }
        }
        for (let i = 0; i < this._pendingNewAndUpdates.updates.count(); i++) {
            newAndUpdates.updates.add(this._pendingNewAndUpdates.updates.observations[i]);
        }
        this._pendingNewAndUpdates.clear();

        await this.send(newAndUpdates);
    }

    /**
     * Goes through each observation and figures out if the geometry type matches the arc feature layer.
     * If so it then separates the adds from the updates and sends them to the arc feature layer.
     * @param {ArcObjects} observations - The observations to process.
     */
    async processArcObjects(observations: ArcObjects) {
        const arcObjectsForLayer = new ArcObjects();
        arcObjectsForLayer.firstRun = observations.firstRun;
        for (const arcObservation of observations.observations) {
            if (this.layerInfo.geometryType === arcObservation.esriGeometryType) {
                arcObjectsForLayer.add(arcObservation);
            }
        }

        const bins = new ObservationBins();

        const existingObsIds = await this.existingObservationIds();

        for (const arcObservation of arcObjectsForLayer.observations) {
            if (existingObsIds.has(arcObservation.id)) {
                bins.updates.add(arcObservation);
            } else {
                bins.adds.add(arcObservation);
            }
        }

        for (const arcObservation of bins.updates.observations) {
            this._existenceQueryCounts++;
            this.featureQuerier.queryObservation(arcObservation.id, (result) => {
                this._existenceQueryCounts--;
                if (result.features != null && result.features.length > 0) {
                    const arcAttributes = result.features[0].attributes;

                    let featureLastModified = null;
                    if (this._config.lastModifiedField != null) {
                        featureLastModified = Number(arcAttributes[this._config.lastModifiedField]);
                    }
                    if (!featureLastModified || featureLastModified < arcObservation.lastModified) {

                        const objectIdField = result.objectIdFieldName;
                        const updateAttributes = arcObservation.object.attributes;

                        updateAttributes[objectIdField] = arcAttributes[objectIdField];

                        // Determine if any editable attribute values should be deleted
                        const lowerCaseUpdateAttributes = Object.fromEntries(
                            Object.entries(updateAttributes).map(([k, v]) => [k.toLowerCase(), v])
                        );
                        for (const arcAttribute of Object.keys(arcAttributes)) {
                            if (this.layerInfo.isEditable(arcAttribute)
                                && arcAttributes[arcAttribute] != null
                                && lowerCaseUpdateAttributes[arcAttribute.toLowerCase()] == null) {
                                updateAttributes[arcAttribute] = null;
                            }
                        }

                        this._pendingNewAndUpdates.updates.add(arcObservation);
                    }

                } else {
                    this._pendingNewAndUpdates.adds.add(arcObservation);
                }
            }, undefined, false);
        }
        bins.updates = this._pendingNewAndUpdates.updates;

        await this.send(bins);

        for (const arcObservation of observations.deletions) {
            if (this.layerInfo.geometryType === arcObservation.esriGeometryType && existingObsIds.has(arcObservation.id)) {
                await this.sender.sendDelete(arcObservation.id);
            }
        }
    }

    /**
     * Sends all the observations to the arc server.
     * @param {ObservationBins} bins - The observations to send.
     */
    private async send(bins: ObservationBins) {
        const promises = [];
        if (!bins.adds.isEmpty()) {
            promises.push(this.sender.sendAdds(bins.adds));
        }
        if (!bins.updates.isEmpty()) {
            promises.push(this.sender.sendUpdates(bins.updates));
        }
        await Promise.all(promises);
    }

    /**
     * Query for all existing observation IDs in the feature layer
     */
    private async existingObservationIds(): Promise<Set<string>> {
        const ids = new Set<string>();
        await this.featureQuerier.queryDistinct((result: QueryObjectResult) => {
            result.features.forEach(feature => {
                ids.add(feature.attributes[this._config.observationIdField] as string);
            });
        }, this._config.observationIdField);
        return ids;
    }
}