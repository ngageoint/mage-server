import buffer from 'buffer'
import fs_async from 'fs/promises'
import path from 'path'
import stream from 'stream/web'
import { URLSearchParams } from 'url'
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import geojson from 'geojson'
import uniqid from 'uniqid'

export class MageClientSession {

  readonly http: AxiosInstance
  accessToken: string | null = null
  user: any = null

  get authHeader(): { Authorization: string } {
    return { Authorization: `bearer ${this.accessToken}` }
  }

  constructor(readonly mageUrl: string) {
    this.http = axios.create({ baseURL: mageUrl })
    this.http.interceptors.request.use((config: InternalAxiosRequestConfig<any>) => {
      const headers = config.headers
      if (headers.hasAuthorization()) {
        return config
      }
      else if (this.accessToken) {
        headers.setAuthorization(this.authHeader.Authorization)
      }
      return config
    })
    this.http.interceptors.response.use(
      res => res,
      err => {
        console.error(err)
        return Promise.reject(err)
      }
    )
  }

  async signIn(username: string, password: string, device: string): Promise<void | Error> {
    this.accessToken = null
    this.user = null
    try {
      const signInRes = await this.http.post(
        '/auth/local/signin',
        new URLSearchParams({ username, password }),
        {
          headers: {
            'content-type': 'application/x-www-form-urlencoded'
          }
        }
      )
      const { user, token } = signInRes.data
      const authzRes = await this.http.post(
        '/auth/token',
        { uid: device },
        {
          headers: {
            'authorization': `bearer ${token}`,
            'content-type': 'application/json'
          }
        }
      )
      this.accessToken = authzRes.data.token
      this.user = user
      console.info('successfully signed in', user.username)
    }
    catch (err) {
      console.error(err)
      return new Error('sign in failed: ' + String(err))
    }
  }

  async setupRootUser(setup: RootUserSetupRequest): Promise<AxiosResponse<{ user: User, device: Device }>> {
    return await this.http.post('/api/setup', { ...setup, passwordconfirm: setup.password })
  }

  async listRoles(): Promise<AxiosResponse<Role[]>> {
    return await this.http.get<Role[]>('/api/roles')
  }

  async createUser(body: UserCreateRequest): Promise<AxiosResponse<User>> {
    return await this.http.post(`/api/users`, body)
  }

  async listEvents(): Promise<Event[]> {
    const res = await this.http.get('/api/events')
    return res.data
  }

  async createEvent(mageEvent: MageEventCreateRequest): Promise<AxiosResponse<MageEvent>> {
    return await this.http.post('/api/events', mageEvent)
  }

  async readEvent(id: MageEventId): Promise<AxiosResponse<MageEvent>> {
    return await this.http.get(`/api/events/${id}`)
  }

  async createForm(mageEventId: MageEventId, form: MageFormCreateRequest): Promise<AxiosResponse<MageForm>> {
    return await this.http.post(`/api/events/${mageEventId}/forms`, form)
  }

  saveMapIcon(filePath: string, eventId: MageEventId, formId: number): Promise<AxiosResponse<MapIcon>>
  saveMapIcon(filePath: string, eventId: MageEventId, formId: number, primaryValue: string): Promise<AxiosResponse<MapIcon>>
  saveMapIcon(filePath: string, eventId: MageEventId, formId: number, primaryValue: string, secondaryValue: string): Promise<AxiosResponse<MapIcon>>
  saveMapIcon(data: buffer.Buffer | stream.ReadableStream, iconName: string, eventId: MageEventId, formId: number): Promise<AxiosResponse<MapIcon>>
  saveMapIcon(data: buffer.Buffer | stream.ReadableStream, iconName: string, eventId: MageEventId, formId: number, primaryValue: string): Promise<AxiosResponse<MapIcon>>
  saveMapIcon(data: buffer.Buffer | stream.ReadableStream, iconName: string, eventId: MageEventId, formId: number, primaryValue: string, secondaryValue: string): Promise<AxiosResponse<MapIcon>>
  async saveMapIcon(...args: any[]): Promise<AxiosResponse<MapIcon>> {
    const [ data, iconName, eventId, formId, primary, variant ] = await (async (): Promise<[ data: Buffer | stream.ReadableStream, iconName: string, eventId: MageEventId, formId: number, primary: string | undefined, variant: string | undefined ]> => {
      if (typeof args[0] === 'string') {
        const [ filePath, eventId, formId, primary, variant ] = args
        const iconName = path.basename(filePath)
        const fh = await fs_async.open(filePath)
        const data = fh.readableWebStream()
        return [ data, iconName, eventId, formId, primary, variant ]
      }
      return [ args[0], args[1], args[2], args[3], args[4], args[5] ]
    })()
    const primaryPath = primary ? `/${primary}` : ''
    const variantPath = primary && variant ? '/${variant}' : ''
    const form = new FormData()
    const blob = new buffer.Blob([])
    blob.stream = (): stream.ReadableStream => data instanceof stream.ReadableStream ? data : new stream.ReadableStream({
      async start(controller): Promise<void> {
        for await (const chunk of data) {
          controller.enqueue(chunk)
        }
      }
    })
    form.append('icon', blob as any, iconName)
    return await this.http.postForm(`/api/events/${eventId}/icons/${formId}${primaryPath}${variantPath}`, form)
  }

  async saveObservation(mod: ObservationMod, attachmentUploads: AttachmentUpload[]): Promise<Observation> {
    if (mod.id === null) {
      const newIdRes = await this.http.post(`/api/events/${mod.eventId}/observations/id`)
      const id = newIdRes.data.id as string
      mod.id = id
    }
    const saved = await this.http.put<Observation>(`/api/events/${mod.eventId}/observations/${mod.id}`).then(x => x.data)
    for (const upload of attachmentUploads) {
      await savedAttachmentForMod(upload.attachmentInfo, saved)
    }
    return await this.readObservation(saved.eventId, saved.id)
  }

  async saveAttachmentContent(content: NodeJS.ReadableStream, attachment: Attachment, observation: Observation): Promise<Attachment> {
    const form = new FormData()
    form.append('attachment', content as any, attachment.name)
    return await this.http.put(
      `/api/events/${observation.eventId}/observations/${observation.id}/attachments/${attachment.id}`, form)
      .then(x => x.data)
  }

  async readObservation(eventId: MageEventId, observationId: ObservationId): Promise<Observation> {
    return await this.http.get<Observation>(`/api/events/${eventId}/observations/${observationId}`).then(x => x.data)
  }

  async postUserLocation(eventId: number, lon: number, lat: number): Promise<any> {
    const res = await this.http.post(`/api/events/${eventId}/locations`,
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [ lon, lat ]
        },
        properties: {
          timestamp: new Date().toISOString(),
          accuracy: 1
        }
      }
    )
    return res
  }

  async startExport(eventId: MageEventId, opts: ExportOptions): Promise<Export> {
    const optsJson: ExportRequestJson = {
      ...opts,
      eventId,
      startDate: opts.startDate?.toISOString(),
      endDate: opts.endDate?.toISOString(),
    }
    return await this.http.post<Export>(`/api/exports`, optsJson).then(x => x.data)
  }

  async readExport(id: ExportId): Promise<Export> {
    return await this.http.get<Export>(`/api/exports/${id}`).then(x => x.data)
  }

  async waitForExport(id: ExportId, timeoutMillis: number = 15000): Promise<Export> {
    const exportInfo = await this.readExport(id)
    if (exportInfo.status === ExportStatus.Completed || exportInfo.status === ExportStatus.Failed) {
      return exportInfo
    }
    const start = Date.now()
    return new Promise<Export>(function tryAgain(this: MageClientSession, resolve: any, reject: any): void {
      this.readExport(id).then(exportInfo => {
        if (Date.now() - start > timeoutMillis) {
          return reject(new ExportTimeoutError(exportInfo, `timed out after ${timeoutMillis}ms waiting for export ${id}`))
        }
        if (exportInfo.status === ExportStatus.Completed || exportInfo.status === ExportStatus.Failed) {
          return resolve(exportInfo)
        }
        setTimeout(() => tryAgain.bind(this)(resolve, reject), 250)
      })
    }.bind(this))
  }
}

export type ISODateString = string

export interface Role {
  id: string,
  name: string,
  description?: string,
  permissions: string[]
}

export interface UserCreateRequest {
  username: string
  displayName: string
  email?: string
  phone?: string
  roleId: string
  password: string
  passwordconfirm: string
}

export interface UserPhone {
  type: string
  number: string
}

export interface User {
  id: UserId
  username: string
  displayName: string
  email?: string
  phones: UserPhone[]
  roleId: string
}

export type UserId = string

export type UserLite = Pick<User, 'id' | 'displayName'>

export interface Device {
  uid: string
  description?: string
  userId: string
  userAgent?: string
  appVersion?: string
}

export type RootUserSetupRequest = Omit<UserCreateRequest, 'passwordconfirm' | 'roleId'> & Pick<Device, 'uid'>

export interface MageEvent {
  id: MageEventId
  name: string
  description?: string
  style: LineStyle
  forms: MageForm[]
  teamIds: string[]
  layerIds: string[]
  feedIds: string[]
}

export type MageEventId = number

export interface MageForm {
  id: MageFormId
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
  fields: MageFormField[]
}

export type MageFormId = number

export interface MageFormField {
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

export type MageFormFieldId = number

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

export enum AttachmentPresentationType {
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
}

export interface LineStyle {
  /**
   * Hex RGB string beginning with '#'
   */
  fill?: string,
  /**
   * Hex RGB string beginning with '#'
   */
  stroke?: string,
  /**
   * Number between 0 and 1
   */
  fillOpacity?: number,
  /**
   * Number between 0 and 1
   */
  strokeOpacity?: number,
  /**
   * Decimal stroke width
   */
  strokeWidth?: number,
}

export type BaseFormStyle = LineStyle & {
  [variantFieldEntry: string]: PrimaryFieldStyle | LineStyle[keyof LineStyle]
}

export type PrimaryFieldStyle = LineStyle & {
  [variantFieldEntry: string]: VariantFieldStyle
}

export type VariantFieldStyle = LineStyle

export type MageEventCreateRequest = Pick<MageEvent, 'name' | 'description' | 'style'>

export type MageFormCreateRequest = Omit<MageForm, 'id'>

export interface MapIcon {
  eventId: MageEventId
  formId?: MageFormId
  primary?: string
  variant?: string
  relativePath: string
}

export interface Observation<G extends geojson.Geometry = geojson.Geometry> extends geojson.Feature<G, ObservationProperties> {
  id: ObservationId
  eventId: MageEventId
  userId?: UserId
  deviceId?: string
  createdAt: ISODateString
  lastModified: ISODateString
  attachments: Attachment[]
  important?: ObservationImportantFlag
  favoriteUserIds: UserId[]
}

export type ObservationId = string

export interface ObservationProperties {
  timestamp: string
  provider?: string
  accuracy?: number
  delta?: number
  forms: MageFormEntry[]
}

export interface MageFormEntry {
  id: MageFormEntryId
  formId: MageFormId
  [formFieldKey: string]: any
}

export type MageFormEntryId = string

export interface Attachment {
  id: string
  observationFormId: MageFormEntryId
  fieldName: string
  lastModified?: Date
  contentType?: string
  size?: number
  name?: string
  width?: number
  height?: number
  contentStored: boolean
  url?: string
}

export interface ObservationImportantFlag {
  userId?: UserId
  user?: UserLite
  timestamp?: ISODateString
  description?: string
}

export type ObservationMod = Omit<Observation<geojson.Geometry>, 'id' | 'attachments' | 'createdAt' | 'deviceId' | 'favoriteUserIds' | 'important' | 'lastModified' | 'properties' | 'state' | 'user' | 'userId'> & {
  id: ObservationId | null
  properties: ObservationPropertiesMod
}

export type ObservationPropertiesMod = Omit<ObservationProperties, 'forms'> & {
  forms: MageFormEntryMod[]
}

export type MageFormEntryMod =
  & Partial<Pick<MageFormEntry, 'id'>>
  & Pick<MageFormEntry, 'formId'>
  & { [formFieldName: string]: any | AttachmentMod[] | undefined }

export function addUploadIdToAttachmentMod(x: AttachmentMod): AttachmentMod {
  const uploadId = uniqid()
  return {
    ...x,
    id: uploadId,
    name: `${uploadId}$$${x.name}`,
  }
}

export function savedAttachmentForMod(mod: AttachmentMod, observation: Observation): [ attachment: Attachment | undefined, index: number ] {
  if (!mod.name) {
    throw new Error('attachment must have a name')
  }
  const uploadId = mod.name.substring(mod.name.indexOf('$$'), 0)
  if (!uploadId) {
    throw new Error(`failed to find upload id in attachment name ${mod.name}`)
  }
  const pos = observation.attachments.findIndex(x => String(x.name).startsWith(uploadId))
  const attachment = observation.attachments[pos]
  return [ attachment, pos ]
}

export type AttachmentMod = Partial<Attachment> & {
  action?: AttachmentModAction
  id?: any
}

export enum AttachmentModAction {
  Add = 'add',
  Delete = 'delete',
}

export interface AttachmentUpload {
  attachmentInfo: AttachmentMod
  attachmentContent: () => NodeJS.ReadableStream
}

interface Export {
  id: ExportId
  userId: UserId
  exportType: ExportFormat
  status: ExportStatus
  options: {
    eventId: MageEventId,
    filter: Omit<ExportRequestJson, 'eventId'>
  },
  expirationDate: ISODateString
  filename?: string,
  relativePath?: string,
  url?: string
  processingErrors: ExportError[]
}

interface ExportOptions {
  exportType: ExportFormat
  startDate?: Date
  endDate?: Date
  observations?: boolean
  favorites?: boolean
  important?: boolean
  attachments?: boolean
  locations?: boolean
}

interface ExportRequestJson {
  eventId: number
  startDate?: ISODateString
  endDate?: ISODateString
  observations?: boolean
  favorites?: boolean
  important?: boolean
  attachments?: boolean
  locations?: boolean
}

export type ExportId = string

export enum ExportFormat {
  GeoPackage = 'geopackage',
  KML = 'kml',
  CSV = 'csv',
  GeoJSON = 'geojson',
}

export enum ExportStatus {
  Starting = 'Starting',
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed',
}

export interface ExportError {
  type: string
  message: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export class ExportTimeoutError extends Error {
  constructor(readonly exportInfo: Export, message: string) {
    super(message)
  }
}
