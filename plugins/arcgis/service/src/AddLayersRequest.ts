/**
 * ArcGIS Add Layer(s) to Definition request.
 * https://developers.arcgis.com/rest/services-reference/online/add-to-definition-feature-service-.htm
 */
export interface AddLayersRequest {
    layers: Layer[]
}

export interface Layer {
    id: number
    name: string
    type: string
    geometryType: string
    fields: Field[]
}

export interface Field {
    name: string
    type: string
    actualType?: string
    alias: string
    sqlType: string
    length: number
    nullable: boolean
    editable: boolean
    domain?: string
    defaultValue?: any
}
