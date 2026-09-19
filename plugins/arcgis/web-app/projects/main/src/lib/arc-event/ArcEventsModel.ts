import { ArcEvent } from "./ArcEvent";

export class ArcEventsModel {
    allEvents: Array<ArcEvent>;

    constructor() {
        this.allEvents = new Array<ArcEvent>();
    }

    // events currently turned on to synchronize, derived from allEvents so there is a single source of truth
    get events(): Array<ArcEvent> {
        return this.allEvents.filter((event) => event.selected);
    }
}