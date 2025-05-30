import { MageEventId } from "@ngageoint/mage.service/lib/entities/events/entities.events";
import { LayerInfoResult, LayerField } from "./types/LayerInfoResult";

/**
 * Contains information about a specific arc feature layer.
 */
export class LayerInfo {

    /**
     * The url to the feature layer.
     */
    url: string;

    /**
     * The access token
     */
    token?: string;

    /**
     * The geometry type this feature layer accepts.
     */
    geometryType: string;

    /**
     * Mapping between field names and layer fields.
     */
    layerFields: Map<string, LayerField> = new Map();

    /**
     * The events that are synching to this layer.
     */
    events: Set<MageEventId> = new Set<MageEventId>();

    /**
     * Constructor.
     * @param {string} url The url to the feature layer.
     * @param {MageEventId[]} events The events that are synching to this layer.
     * @param {LayerInfoResult} layerInfo The layer info.
     */
    constructor(url: string, events: MageEventId[], layerInfo: LayerInfoResult) {
        this.url = url

        if (events && events.length > 0) {
            for (const event of events) {
                this.events.add(event);
            }
        }
        this.geometryType = layerInfo.geometryType;
        for (const field of layerInfo.fields) {
            this.layerFields.set(field.name, field);
        }
    }

    /**
     * Determine if the field is editable.
     * @param {string} field The field name.
     * @returns {boolean} true if editable
     */
    isEditable(field: string): boolean {
        let editable = false;
        const layerField = this.layerFields.get(field);
        if (layerField != null) {
            editable = layerField.editable;
        }
        return editable;
    }

    /**
     * Determine if the layer is enabled for the event.
     * @param {MageEventId} eventId The event.
     * @returns {boolean} true if enabled
     */
    hasEvent(eventId: MageEventId) {
        return this.events.size === 0 || this.events.has(eventId)
    }

}