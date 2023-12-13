import { ArcEventLayer } from "./ArcEventLayer";

export class ArcEvent {
    name: string;
    id: number;
    layers: ArcEventLayer[];

    constructor(name: string, id: number, layers: ArcEventLayer[]) {
        this.name = name;
        this.id = id;
        this.layers = layers;
    }
}