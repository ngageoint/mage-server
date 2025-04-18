import { ArcObject } from "./ArcObject"

/**
 * ArcGIS feature layer query result.
 * https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer-.htm
 */
export interface QueryObjectResult {

    /**
     * Contains the field name of the objectId field.
     */
    objectIdFieldName: string;

    /**
     * The features matching the query and their attributes.
     */
    features: ArcObject[];

}