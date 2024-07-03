export class ArcLayerSelectable {
    name: string;
    isSelected: boolean;

    constructor(name: string) {
        this.name = name;
        this.isSelected = true;
    }
}