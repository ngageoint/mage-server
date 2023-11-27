/**
 * ArcGIS Attachment Infos result.
 * https://developers.arcgis.com/rest/services-reference/enterprise/attachment-infos-feature-service-.htm
 */
export interface AttachmentInfosResult {
    attachmentInfos: AttachmentInfo[]
}

/**
 * Attachment Info.
 */
export interface AttachmentInfo {
    id: number
    contentType: string
    size: number
    name: string
}