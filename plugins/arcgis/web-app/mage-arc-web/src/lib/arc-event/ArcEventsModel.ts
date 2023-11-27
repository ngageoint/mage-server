import { ArcEvent } from "./ArcEvent";

export class ArcEventsModel {
    events: ArcEvent[];

    constructor() {
        this.events = new Array<ArcEvent>();
    }
}