import { LineStyle } from '../entities.global'


export type FormId = number

/**
 * A `Form` instance defines a group of form fields that a user must fill to
 * submit observation data.
 */
export interface Form {
  id: FormId
  name: string
  description?: string
  /**
   * Require at least the given number of entries for this form.
   */
  min?: number
  /**
   * Limit the entries for this form to the given number.
   */
  max?: number
  fields: FormField[]
  /**
   * Use the value of the specified field as the first component in a map style
   * rule that determines the map marker for observations with entries for this
   * form.  For example, the primary field could be `vehicleType`, and values
   * could map to different icon images that represent types of vehicles.
   */
  primaryField?: string
  /**
   * Use the value of the specified field as the second component in a map style
   * rule that determines the map marker for observations with entries for this
   * form.  For example, the variant field could be `color`, and values could
   * map to defined color values to apply to the map marker.
   */
  variantField?: string
  /**
   * Use the value of the specified field as the most prominent heading value
   * that a feed list view would display for an observation.
   */
  primaryFeedField?: string
  /**
   * Use the value of the specified field as a sub-heading value that a feed
   * list view would display for an observation.
   */
  secondaryFeedField?: string
  /**
   * This is a list of references to fields that are dropdowns whose choices
   * are MAGE users' names.
   * TODO: this could be modeled better as a general choice field that
   * specifies a data source for its choices
   */
  userFields: string[]
  /**
   * Color must be a valid hexadecimal color string prefixed with a "#" symbol,
   * e.g., #0a0b0c.
   */
  color: string
  style?: BaseFormStyle
  archived: boolean
}

export type BaseFormStyle = LineStyle & {
  [variantFieldEntry: string]: PrimaryFieldStyle | LineStyle[keyof LineStyle]
}

export type PrimaryFieldStyle = LineStyle & {
  [variantFieldEntry: string]: VariantFieldStyle
}

export type VariantFieldStyle = LineStyle

export function copyFormAttrs(x: Form): Form {
  return {
    id: x.id,
    archived: x.archived,
    name: x.name,
    description: x.description,
    max: x.max,
    min: x.min,
    fields: x.fields.map(copyFormFieldAttrs),
    primaryField: x.primaryField,
    variantField: x.variantField,
    primaryFeedField: x.primaryFeedField,
    secondaryFeedField: x.secondaryFeedField,
    color: x.color,
    style: x.style ? copyBaseFormStyle(x.style) : undefined,
    userFields: x.userFields ? [ ...x.userFields ] : [],
  }
}

export function copyFormFieldAttrs(x: FormField): FormField {
  return {
    id: x.id,
    name: x.name,
    required: x.required,
    title: x.title,
    type: x.type,
    archived: x.archived,
    min: x.min,
    max: x.max,
    value: x.value,
    choices: x.choices?.map(copyFormFieldChoiceAttrs),
    allowedAttachmentTypes: x.allowedAttachmentTypes ? [ ...x.allowedAttachmentTypes ] : undefined
  }
}

export function copyFormFieldChoiceAttrs(x: FormFieldChoice): FormFieldChoice {
  return {
    id: x.id,
    title: x.title,
    value: x.value,
    blank: x.blank
  }
}

export function copyBaseFormStyle(x: BaseFormStyle): BaseFormStyle {
  return copyFieldEntryStyles(x, 2)
}

function copyFieldEntryStyles(x: BaseFormStyle, depth: number): BaseFormStyle {
  const lineStyleKeys: Record<keyof LineStyle, true> = {
    fill: true,
    stroke: true,
    fillOpacity: true,
    strokeOpacity: true,
    strokeWidth: true
  }
  return Object.getOwnPropertyNames(x).reduce((copy, key) => {
    if (lineStyleKeys[key as keyof LineStyle]) {
      copy[key] = x[key]
    }
    else if (depth > 0 && x[key] !== undefined) {
      copy[key] = copyFieldEntryStyles(x[key] as BaseFormStyle, depth - 1) as any
    }
    return copy
  }, {} as BaseFormStyle)
}

export interface FormField {
  id: number,
  archived?: boolean,
  name: string,
  title: string,
  type: FormFieldType,
  required: boolean,
  value?: any,
  choices?: FormFieldChoice[],
  /**
   * The absence of any media type constraints indicates the field allows any
   * file type as an attachment.
   */
  allowedAttachmentTypes?: AttachmentPresentationType[]
  /**
   * The minimum constraint applies to the value of a numeric field or to the
   * number of attachments required on an attachment field.
   */
  min?: number,
  /**
   * The maximum constraint applies to the value of a numeric field or to the
   * number of attachments allowed on an attachment field.
   */
  max?: number
}

/**
 * Attachment presentation type is the general category of how the content of an
 * attachment is presented and consumed.
 */
export enum AttachmentPresentationType {
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
}

/**
 * The attachment media types are the [IANA registered Media Type](https://www.iana.org/assignments/media-types/media-types.xhtml)
 * designations associated with the {@link content types} that MAGE supports.
 */
export const AttachmentMediaTypes: { [MediaType in AttachmentPresentationType]: readonly string[] } = Object.freeze({
  [AttachmentPresentationType.Image]: Object.freeze([ 'image/gif', 'image/jpeg', 'image/png', 'image/webp' ]),
  [AttachmentPresentationType.Video]: Object.freeze([ 'video/mp4', 'video/quicktime' ]),
  [AttachmentPresentationType.Audio]: Object.freeze([ 'audio/mp4' ]),
})

/**
 * TODO: this should probably move to the observations entity module with other validations
 * Return true if the allowed attachment MIME types for the given form field
 * include the given MIME type of a submitted attachment.
 * @param field
 * @param attachmentMimeType
 */
export const attachmentTypeIsValidForField = (field: FormField, attachmentMimeType: string | null | undefined): boolean => {
  if (!field.allowedAttachmentTypes || field.allowedAttachmentTypes.length === 0) {
    return true
  }
  const allowedTypes = field.allowedAttachmentTypes || []
  return typeof attachmentMimeType === 'string' && allowedTypes
    .map(mediaType => AttachmentMediaTypes[mediaType])
    .some(mimeTypes => mimeTypes.includes(attachmentMimeType))
}

export enum FormFieldType {
  Attachment = 'attachment',
  CheckBox = 'checkbox',
  DateTime = 'date',
  Dropdown = 'dropdown',
  Email = 'email',
  Geometry = 'geometry',
  Hidden = 'hidden',
  MultiSelectDropdown = 'multiselectdropdown',
  Numeric = 'numberfield',
  Password = 'password',
  Radio = 'radio',
  Text = 'textfield',
  TextArea = 'textarea',
}

export interface FormFieldChoice {
  id: number,
  title: string,
  value: number,
  blank?: boolean
}
