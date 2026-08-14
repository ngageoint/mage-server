import { ArcEventLayer } from "./ArcEventLayer";

export class ArcEvent {
    name: string;
    id: number;
    layers: ArcEventLayer[];
    selected: boolean;
    syncAfter?: string;

    constructor(name: string, id: number, layers: ArcEventLayer[], selected = false) {
        this.name = name;
        this.id = id;
        this.layers = layers;
        this.selected = selected;
    }
}