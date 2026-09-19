import { ArcEventLayer } from "./ArcEventLayer";

export class ArcEvent {
    name: string;
    id: number;
    layers: ArcEventLayer[];
    selected: boolean;

    private _syncAfter?: string;
    private _syncAfterDate: Date | null = null;

    constructor(name: string, id: number, layers: ArcEventLayer[], selected = false) {
        this.name = name;
        this.id = id;
        this.layers = layers;
        this.selected = selected;
    }

    get syncAfter(): string | undefined {
        return this._syncAfter;
    }

    set syncAfter(value: string | undefined) {
        this._syncAfter = value;
        this._syncAfterDate = value ? new Date(value) : null;
    }

    get syncAfterDate(): Date | null {
        return this._syncAfterDate;
    }
}