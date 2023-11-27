/**
 * ArcGIS feature service layer result.
 * https://developers.arcgis.com/rest/services-reference/enterprise/layer-feature-service-.htm
 */
export interface LayerInfoResult {

    /**
     * The geometry type this feature layer accepts.
     */
    geometryType: string

    /**
     * The feature layer fields.
     */
    fields: LayerField[]

}

/**
 * Contains information about a specific arc feature layer field.
 */
export interface LayerField {
    name: string
    editable: boolean
}