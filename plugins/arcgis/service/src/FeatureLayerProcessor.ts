import { ArcGISPluginConfig } from "./types/ArcGISPluginConfig";
import { ArcObjects } from "./ArcObjects";
import { FeatureQuerier } from "./FeatureQuerier";
import { LayerInfo } from "./LayerInfo";
import { ObservationBinner } from "./ObservationBinner";
import { ObservationBins } from "./ObservationBins";
import { ObservationsSender } from "./ObservationsSender";
import { ArcGISIdentityManager } from "@esri/arcgis-rest-request";
/**
 * Processes new, updated, and deleted observations and sends the changes to a specific arc feature layer.
 */
export class FeatureLayerProcessor {

    /**
     * Information about the arc feature layer this class sends observations to.
     */
    layerInfo: LayerInfo;

    /**
     * Bins the observations into updates and adds.
     */
    private _binner: ObservationBinner;

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
    lastTimeStamp: number;

    /**
     * Creates a new instance of FeatureLayerProcessor.
     * @param {LayerInfo} layerInfo - Information about the arc feature layer this class sends observations to.
     * @param {ArcGISPluginConfig} config - Contains certain parameters that can be configured.
     * @param {ArcGISIdentityManager} identityManager - ArcGIS identity manager for authentication.
     * @param {Console} console - Used to log messages to the console.
     */
    constructor(layerInfo: LayerInfo, config: ArcGISPluginConfig, identityManager: ArcGISIdentityManager, console: Console) {
        this.layerInfo = layerInfo;
        this.lastTimeStamp = 0;
        this.featureQuerier = new FeatureQuerier(layerInfo, config, identityManager, console);
        this._binner = new ObservationBinner(layerInfo, this.featureQuerier, config);
        this.sender = new ObservationsSender(layerInfo, config, identityManager, console);
    }

    /**
     * Indicates if this processor has pending updates still waiting to be processed.
     * @returns {boolean} True if it is still waiting for updates to be processed, false otherwise.
     */
    hasPendingUpdates(): boolean {
        return this._binner.hasPendingUpdates();
    }

    /**
     * Checks to see if there are any updates that need to be sent to the feature layer.
     */
    async processPendingUpdates() {
        const bins = this._binner.pendingUpdates();
        await this.send(bins);
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

        const bins = this._binner.sortEmOut(arcObjectsForLayer);
        await this.send(bins);

        for (const arcObservation of observations.deletions) {
            if (this.layerInfo.geometryType === arcObservation.esriGeometryType) {
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
}