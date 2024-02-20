/**
 * The ArcGIS Feature Object
 * https://developers.arcgis.com/documentation/common-data-types/feature-object.htm
 */
export interface ArcObject {
    geometry: ArcGeometry,
    attributes: {
        [key: string]: any
    }
}

/**
 * The ArcGIS base Geometry Object
 * https://developers.arcgis.com/documentation/common-data-types/geometry-objects.htm
 */
export interface ArcGeometry {
    spatialReference: {
        wkid: number
    }
}

/**
 * The ArcGIS Point Object
 * https://developers.arcgis.com/documentation/common-data-types/geometry-objects.htm#POINT
 */
export interface ArcPoint extends ArcGeometry {
    x: number
    y: number
}

/**
 * The ArcGIS Polyline Object
 * https://developers.arcgis.com/documentation/common-data-types/geometry-objects.htm#POLYLINE
 */
export interface ArcPolyline extends ArcGeometry {
    paths: number[][][]
}

/**
 * The ArcGIS Polygon Object
 * https://developers.arcgis.com/documentation/common-data-types/geometry-objects.htm#POLYGON
 */
export interface ArcPolygon extends ArcGeometry {
    rings: number[][][]
}
