import { MageEventAttrs } from "@ngageoint/mage.service/lib/entities/events/entities.events";
import { FeatureLayerProcessor } from "./FeatureLayerProcessor";

/**
 * Contains a MAGE event and the FeatureLayerProcessor the even is configure to sync to.
 */
export class EventToLayerProcessor {
    /**
     * The MAGE event.
     */
    event: MageEventAttrs;

    /**
     * The FeatureLayerProcessors the even is synching to.
     */
    featureLayerProcessors: FeatureLayerProcessor[]

    /**
     * Constructor.
     * @param event The MAGE event.
     * @param featureLayerProcessors The FeatureLayerProcessors the even is synching to.
     */
    constructor(event: MageEventAttrs, featureLayerProcessors: FeatureLayerProcessor[]) {
        this.event = event;
        this.featureLayerProcessors = featureLayerProcessors;
    }
}