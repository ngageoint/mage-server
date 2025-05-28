import { ArcEvent } from "./ArcEvent";

export class ArcEventsModel {
    allEvents: Array<ArcEvent>;
    events: Array<ArcEvent>;

    constructor() {
        this.allEvents =  new Array<ArcEvent>();
        this.events = new Array<ArcEvent>();
    }
}