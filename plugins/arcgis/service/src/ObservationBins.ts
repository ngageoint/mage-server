import { ArcObjects } from "./ArcObjects";

/**
 * Contains the arc objects that either need to be added or updated to the arc server.
 */
export class ObservationBins {

    /**
     * The arc objects to add to the server.
     */
    adds: ArcObjects;

    /**
     * The arc objects to update on the server.
     */
    updates: ArcObjects;

    /**
     * Constructor.
     */
    constructor() {
        this.adds = new ArcObjects();
        this.updates = new ArcObjects();
    }

    /**
     * Clear the observations.
     */
    clear() {
        this.adds.clear()
        this.updates.clear()
    }

}