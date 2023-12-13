import { ArcGISPluginConfig } from "./ArcGISPluginConfig";
import { ArcObjects } from "./ArcObjects";
import { ArcObservation } from "./ArcObservation";
import { FeatureQuerier } from "./FeatureQuerier";
import { ObservationBins } from "./ObservationBins";
import { LayerInfo } from "./LayerInfo";

/**
 * Sorts the observations into a group of new ones and a group of updated ones.
 */
export class ObservationBinner {

    /**
     * Information about the arc feature layer this class sends observations to.
     */
    layerInfo: LayerInfo;

    /**
     * The number of existence queries we are still waiting for.
     */
    private _existenceQueryCounts: number;

    /**
     * The query url to find out if an observations exists on the server.
     */
    private _featureQuerier: FeatureQuerier;

    /**
     * Contains the results from checking if an observation exists on the server.
     */
    private _pendingNewAndUpdates: ObservationBins;

    /**
     * The plugins configuration.
     */
    private _config: ArcGISPluginConfig;

    private _addedObs: Set<string>;

    /**
     * Constructor.
     * @param layerInfo Information about the arc feature layer this class sends observations to.
     * @param featureQuerier Used to query for observation on the arc feature layer.
     * @param config The plugins configuration.
     */
    constructor(layerInfo: LayerInfo, featureQuerier: FeatureQuerier, config: ArcGISPluginConfig) {
        this.layerInfo = layerInfo;
        this._featureQuerier = featureQuerier;
        this._pendingNewAndUpdates = new ObservationBins;
        this._config = config;
        this._existenceQueryCounts = 0;
        this._addedObs = new Set<string>();
    }

    /**
     * Indicates if this binner has pending updates still waiting to be processed.
     * @returns True if it is still waiting for updates to be processed, false otherwise.
     */
    hasPendingUpdates(): boolean {
        return this._existenceQueryCounts > 0;
    }

    /**
     * Gets any pending updates or adds that still need to occur.
     * @returns The updates or adds that still need to occur.
     */
    pendingUpdates(): ObservationBins {
        const newAndUpdates = new ObservationBins();
        for (let i = 0; i < this._pendingNewAndUpdates.adds.count(); i++) {
            if (!this._addedObs.has(this._pendingNewAndUpdates.adds.observations[i].id)) {
                newAndUpdates.adds.add(this._pendingNewAndUpdates.adds.observations[i]);
                this._addedObs.add(this._pendingNewAndUpdates.adds.observations[i].id);
            }
        }
        for (let i = 0; i < this._pendingNewAndUpdates.updates.count(); i++) {
            newAndUpdates.updates.add(this._pendingNewAndUpdates.updates.observations[i]);
        }
        this._pendingNewAndUpdates.clear();

        return newAndUpdates;
    }

    /**
     * Sorts the observations into new observations or update observations.
     * @param observations The observations to sort out.
     * @returns The sorted out observations.
     */
    sortEmOut(observations: ArcObjects): ObservationBins {
        const bins = new ObservationBins();

        for (const arcObservation of observations.observations) {
            const arcObject = arcObservation.object
            if (observations.firstRun
                || arcObservation.lastModified != arcObservation.createdAt) {
                bins.updates.add(arcObservation);
            } else if (!this._addedObs.has(arcObservation.id)) {
                bins.adds.add(arcObservation);
                this._addedObs.add(arcObservation.id);
            }
        }

        for (const arcObservation of bins.updates.observations) {
            this.checkForExistence(arcObservation);
        }
        bins.updates = this._pendingNewAndUpdates.updates;

        return bins;
    }

    /**
     * Checks to see if the observation truly does exist on the server.
     * @param arcObservation The observation to check.
     * @returns True if it exists, false if it does not.
     */
    checkForExistence(arcObservation: ArcObservation) {
        this._existenceQueryCounts++;
        this._featureQuerier.queryObservation(arcObservation.id, (result) => {
            this._existenceQueryCounts--;
            if (result.features != null && result.features.length > 0) {

                const arcAttributes = result.features[0].attributes

                let lastEdited = null
                if (this._config.lastEditedDateField != null) {
                    lastEdited = arcAttributes[this._config.lastEditedDateField]
                }
                if (lastEdited == null || lastEdited < arcObservation.lastModified) {

                    const objectIdField = result.objectIdFieldName
                    const updateAttributes = arcObservation.object.attributes

                    updateAttributes[objectIdField] = arcAttributes[objectIdField]

                    // Determine if any editable attribute values should be deleted
                    const lowerCaseUpdateAttributes = Object.fromEntries(
                        Object.entries(updateAttributes).map(([k, v]) => [k.toLowerCase(), v])
                    )
                    for (const arcAttribute of Object.keys(arcAttributes)) {
                        if (this.layerInfo.isEditable(arcAttribute)
                            && arcAttributes[arcAttribute] != null
                            && lowerCaseUpdateAttributes[arcAttribute.toLowerCase()] == null) {
                            updateAttributes[arcAttribute] = null
                        }
                    }

                    this._pendingNewAndUpdates.updates.add(arcObservation)

                }

            } else {
                this._pendingNewAndUpdates.adds.add(arcObservation);
            }
        }, undefined, false);
    }
}