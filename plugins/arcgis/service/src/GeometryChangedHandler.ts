import { ObservationAttrs } from "@ngageoint/mage.service/lib/entities/observations/entities.observations";
import { ArcObjects } from "./ArcObjects";
import { FeatureLayerProcessor } from "./FeatureLayerProcessor";
import { ObservationsTransformer } from "./ObservationsTransformer";

/**
 * Class that handles geometry changes of an observation.
 */
export class GeometryChangedHandler {

    /**
     * Used to create any delete observations to remove the old geometry observation.
     */
    private _transformer: ObservationsTransformer;

    /**
     * Map of observation id to its previous geometry type.
     */
    private _previousGeoms: Map<string, string>;

    /**
     * Constructor.
     * @param transformer Used to create any delete observations to remove the old geometry observation.
     */
    constructor(transformer: ObservationsTransformer) {
        this._transformer = transformer;
        this._previousGeoms = new Map();
    }

    /**
     * Checks for any geometry changes within an observation, if there is a change create a delete object to delete it
     * from its previous geometry layers.
     * @param observations The observations to check for geometry changes.
     * @param arcObjects The collection to add any previous geometry deletions.
     * @param layerProcessors All the layer processors.
     * @param firstRun True if this is our first run and we need to make sure any changed geometries that occurred right before
     * shutting down, are removed from their previous geometry layer.
     */
    checkForGeometryChange(observations: ObservationAttrs[], arcObjects: ArcObjects, layerProcessors: FeatureLayerProcessor[], firstRun: boolean) {
        for (const observation of observations) {
            if (observation.states.length <= 0 || !observation.states[0].name.startsWith('archive')) {
                if (this._previousGeoms.has(observation.id)) {
                    const previousGeomType = this._previousGeoms.get(observation.id);
                    if (previousGeomType !== undefined && previousGeomType != observation.geometry.type) {
                        const arcObservation = this._transformer.createObservation(observation);
                        arcObservation.esriGeometryType = this._transformer.mageTypeToEsriType(previousGeomType);
                        arcObjects.deletions.push(arcObservation);
                    }
                }

                if (firstRun) {
                    const observationGeomType = this._transformer.mageTypeToEsriType(observation.geometry.type);
                    for (const layerProcessor of layerProcessors) {
                        if (layerProcessor.layerInfo.geometryType != observationGeomType) {
                            const arcObservation = this._transformer.createObservation(observation);
                            arcObservation.esriGeometryType = layerProcessor.layerInfo.geometryType;
                            arcObjects.deletions.push(arcObservation);
                        }
                    }
                }

                this._previousGeoms.set(observation.id, observation.geometry.type);
            }
        }
    }
}