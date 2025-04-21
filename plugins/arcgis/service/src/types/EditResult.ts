/**
 * ArcGIS feature edit (add, update, delete) result.
 * https://developers.arcgis.com/rest/services-reference/enterprise/edit-result-object.htm
 */
export interface EditResult {
    objectId: number
    success: boolean
    error?: {
        code: number
        description: string
    }
}