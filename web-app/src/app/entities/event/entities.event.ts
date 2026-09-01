import { Style } from "../map/entities.map"
import { Layer } from "../layer/layer"
import { Team } from "../team/entities.team"

export type EventId = number

export const EventAccessType = { Read: 'read', Update: 'update', Delete: 'delete' } as const
export type EventAccessType = typeof EventAccessType[keyof typeof EventAccessType]

export const EventRole = { Owner: 'OWNER', Manager: 'MANAGER', Guest: 'GUEST' } as const
export type EventRole = typeof EventRole[keyof typeof EventRole]

export const FormFieldType = {
  Attachment: 'attachment',
  CheckBox: 'checkbox',
  DateTime: 'date',
  Dropdown: 'dropdown',
  Email: 'email',
  Geometry: 'geometry',
  Hidden: 'hidden',
  MultiSelectDropdown: 'multiselectdropdown',
  Numeric: 'numberfield',
  Password: 'password',
  Radio: 'radio',
  Text: 'textfield',
  TextArea: 'textarea',
} as const
export type FormFieldType = typeof FormFieldType[keyof typeof FormFieldType]

export const AttachmentPresentationType = { Image: 'image', Video: 'video', Audio: 'audio' } as const
export type AttachmentPresentationType = typeof AttachmentPresentationType[keyof typeof AttachmentPresentationType]

export const ObservationSearchStatus = { Pending: 'pending', Running: 'running', Indexed: 'indexed' } as const
export type ObservationSearchStatus = typeof ObservationSearchStatus[keyof typeof ObservationSearchStatus]

export type FormFieldChoice = {
  id: number
  title: string
  value: number
}

export type FormField = {
  id: number
  type: FormFieldType
  name: string
  title: string
  value: any
  required: boolean
  archived?: boolean
  allowedAttachmentTypes: AttachmentPresentationType[]
  choices: FormFieldChoice[]
}

type FormStyleProps = {
  fill?: string
  stroke?: string
  fillOpacity?: number
  strokeOpacity?: number
  strokeWidth?: number
}

export type FormFieldStyle = FormStyleProps & {
  [variantFieldValue: string]: FormStyleProps[keyof FormStyleProps] | FormStyleProps
}

export type FormStyle = Record<string, FormFieldStyle>

export type Form = {
  id: number
  name: string
  description?: string
  color: string
  default: boolean
  fields: FormField[]
  primaryField?: string
  variantField?: string
  primaryFeedField?: string
  secondaryFeedField?: string
  userFields: string[]
  archived: boolean
  min?: number
  max?: number
  style?: FormStyle
}

export type Event = {
  id: EventId
  name: string
  description?: string
  teams?: Team[]
  forms: Form[]
  layers: Layer[]
  style: Style
  feedIds: string[]
  acl: Record<string, { role: EventRole; permissions: EventAccessType[] }>
  minObservationForms?: number
  maxObservationForms?: number
  observationSearchStatus?: ObservationSearchStatus
}
