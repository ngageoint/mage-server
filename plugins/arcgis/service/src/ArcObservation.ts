import { ArcObject } from './ArcObject'
import { ObservationId } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'

/**
 * The ArcGIS Observation wraps the raw ArcObject and combines Arc & MAGE metadata.
 */
export interface ArcObservation {
    id: ObservationId,
    createdAt: number,
    lastModified: number,
    object: ArcObject,
    esriGeometryType: string,
    attachments: ArcAttachment[]
}

/**
 * Observation Attachment metadata.
 */
export interface ArcAttachment {
    field: string,
    lastModified: number,
    size: number,
    name: string,
    contentLocator: string
}
