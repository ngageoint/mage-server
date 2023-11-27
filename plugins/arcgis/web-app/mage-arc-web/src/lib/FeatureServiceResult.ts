/**
 * ArcGIS feature service result.
 * https://developers.arcgis.com/rest/services-reference/enterprise/feature-service.htm
 */
export interface FeatureServiceResult {

    /**
     * The layers.
     */
    layers: FeatureLayer[]

}

/**
 * ArcGIS feature service layer.
 */
export interface FeatureLayer {

    /**
     * The layer id.
     */
    id: number

    /**
     * The layer name.
     */
    name: string

    /**
     * The geometry type.
     */
    geometryType: string

}