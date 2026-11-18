import { User } from "@ngageoint/mage.web-core-lib/user"
import { AttachmentAction } from "../../observation/observation-edit/observation-edit-attachment/observation-edit-attachment-action"
import { EventId } from "../event/entities.event"
import { MapFeatureStyle } from "../map/entities.map"

export type ObservationId = string

export const ObservationStateName = Object.freeze({
  Active: 'active',
  Archived: 'archive'
} as const)
export type ObservationStateName = (typeof ObservationStateName)[keyof typeof ObservationStateName]

export type FormProperties = FormPropertiesDraft & {
  id: string
}

export type ObservationMapFeature = GeoJSON.Feature<GeoJSON.Geometry, {
  eventId: EventId
  lastModified: string
  state?: ObservationStateName
  accuracy?: number
}> & {
  id: ObservationId
  style: MapFeatureStyle
}

export type Observation = {
  id: ObservationId
  eventId: EventId
  type: 'Feature'
  geometry: GeoJSON.Geometry
  url: string
  user?: Pick<User, 'id' | 'displayName'>
  userId?: string
  attachments: Attachment[]
  deviceId?: string
  createdAt: Date
  lastModified: string
  style: MapFeatureStyle
  favoriteUserIds: string[]
  properties: {
    forms: FormProperties[]
    timestamp: Date
    provider?: string
    accuracy?: number
    delta?: number
  }
  state?: {
    id: string
    name: ObservationStateName
    userId?: string
    url: string
  }
  important?: {
    description?: string
    timestamp?: Date
    userId?: string
    user?: Pick<User, 'id' | 'displayName'>
  }
}

export type FormPropertiesDraft = {
  id: string | null
  formId: number
  [name: string]: any
}

export type ObservationDraft = Pick<Observation, 'id' | 'eventId' | 'type' | 'geometry'> & {
  properties: Omit<Observation['properties'], 'forms'> & {
    forms: FormPropertiesDraft[]
  }
}

export const AttachmentProcessingStatus = Object.freeze({
  Pending: 'pending',
  Success: 'success',
  Rejected: 'rejected',
  Error: 'error'
} as const)
export type AttachmentProcessingStatus = (typeof AttachmentProcessingStatus)[keyof typeof AttachmentProcessingStatus]

export type Attachment = {
  id: string
  name?: string
  fieldName: string
  observationFormId: string
  oriented: boolean
  contentStored: boolean
  contentType?: string
  lastModified?: Date
  size?: number
  width?: number
  height?: number
  url?: string
  processingStatus?: AttachmentProcessingStatus
  processingMessage?: string
  action?: AttachmentAction
}