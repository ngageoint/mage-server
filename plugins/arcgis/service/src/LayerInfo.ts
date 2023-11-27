import { LayerInfoResult, LayerField } from "./LayerInfoResult";

/**
 * Contains information about a specific arc feature layer.
 */
export class LayerInfo {

    /**
     * The url to the feature layer.
     */
    url: string

    /**
     * The access token
     */
    token?: string

    /**
     * The geometry type this feature layer accepts.
     */
    geometryType: string

    /**
     * Mapping between field names and layer fields.
     */
    layerFields: Map<string, LayerField> = new Map()

    /**
     * The events that are synching to this layer.
     */
    events: Set<string> = new Set<string>()

    /**
     * Constructor.
     * @param url The url to the feature layer.
     * @param events The events that are synching to this layer.
     * @param layerInfo The layer info.
     * @param token The access token.
     */
    constructor(url: string, events: string[], layerInfo: LayerInfoResult, token?: string) {
        this.url = url
        this.token = token
        if (events != undefined && events != null && events.length == 0) {
            this.events.add('nothing to sync')
        }
        if (events != undefined || events != null) {
            for (const event of events) {
                this.events.add(event);
            }
        }
        this.geometryType = layerInfo.geometryType
        for (const field of layerInfo.fields) {
            this.layerFields.set(field.name, field)
        }
    }

    /**
     * Determine if the field is editable.
     * @param field The field name.
     * @return true if editable
     */
    isEditable(field: string): boolean {
        let editable = false
        const layerField = this.layerFields.get(field)
        if (layerField != null) {
            editable = layerField.editable
        }
        return editable
    }

    /**
     * Determine if the layer is enabled for the event.
     * @param event The event.
     * @return true if enabled
     */
    hasEvent(event: string) {
        return this.events.size == 0 || this.events.has(event)
    }

}