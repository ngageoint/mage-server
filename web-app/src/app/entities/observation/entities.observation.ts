import { User } from "@ngageoint/mage.web-core-lib/user"
import { AttachmentAction } from "../../observation/observation-edit/observation-edit-attachment/observation-edit-attachment-action"
import { Style } from "../map/entities.map"
import { EventId } from "../event/entities.event"

export type ObservationId = string

export type FormProperties = {
  id: string
  formId: number
  [name: string]: any
}

export type Observation = {
  id: ObservationId
  eventId: EventId
  type: 'Feature'
  geometry: {
    type: string
    coordinates: number[]
  }
  url: string
  user?: Pick<User, 'id' | 'displayName'>
  userId?: string
  attachments: Attachment[]
  deviceId?: string
  createdAt: Date
  lastModified: Date
  style: Style
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
    name: 'active' | 'archived'
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