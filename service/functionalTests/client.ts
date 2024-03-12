import buffer from 'buffer'
import fs from 'fs'
import path from 'path'
import { URLSearchParams } from 'url'
import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import geojson from 'geojson'
import uniqid from 'uniqid'
import { Readable } from 'stream'
import web_streams from 'stream/web'

export class MageClientSession {

  readonly http: AxiosInstance
  accessToken: string | null = null
  user: User | null = null
  device: Device | null = null

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
        console.error(err.response)
        return Promise.reject(err)
      }
    )
  }

  async signIn(username: string, password: string, device: string | null = null): Promise<SignInResult | Error> {
    this.accessToken = null
    this.user = null
    this.device = null
    try {
      const authnRes = await this.http.post(
        '/auth/local/signin',
        new URLSearchParams({ username, password }),
        {
          headers: {
            'content-type': 'application/x-www-form-urlencoded'
          }
        }
      )
      const authzRes = await this.http.post<SignInResult>('/auth/token',
        device ? { uid: device } : undefined,
        {
          headers: {
            'authorization': `bearer ${authnRes.data.token}`,
            'content-type': 'application/json'
          }
        }
      )
      const signIn = authzRes.data
      this.accessToken = signIn.token
      this.user = signIn.user
      this.device = signIn.device || null
      console.info('successfully signed in', signIn)
      return signIn
    }
    catch (err) {
      console.error(err)
      return new Error('sign in failed: ' + String(err))
    }
  }

  setupRootUser(setup: RootUserSetupRequest): Promise<AxiosResponse<{ user: User, device: Device }>> {
    return this.http.post('/api/setup', { ...setup, passwordconfirm: setup.password })
  }

  readAuthenticationProviders(options?: { includeDisabled: boolean }): Promise<AxiosResponse<AuthenticationProvider[]>> {
    options = options || { includeDisabled: true }
    return this.http.get('/api/authentication/configuration/', { params: options })
  }

  createAuthenticationProvider(provider: Partial<AuthenticationProvider>): Promise<AxiosResponse<AuthenticationProvider>> {
    return this.http.post('/api/authentication/configuration/', provider)
  }

  updateAuthenticationProvider(provider: AuthenticationProvider): Promise<AxiosResponse<AuthenticationProvider>> {
    return this.http.put(`/api/authentication/configuration/${provider._id}`, provider)
  }

  deleteAuthenticationProvider(providerId: string): Promise<AxiosResponse<AuthenticationProvider>> {
    return this.http.delete(`/api/authentication/configuration/${providerId}`)
  }

  listRoles(): Promise<AxiosResponse<Role[]>> {
    return this.http.get<Role[]>('/api/roles')
  }

  createUser(userAttrs: UserCreateRequest, mapIcon?: BlobDuck): Promise<AxiosResponse<User>> {
    const form = new FormData()
    form.set('username', userAttrs.username)
    form.set('displayName', userAttrs.displayName)
    form.set('password', userAttrs.password)
    form.set('passwordconfirm', userAttrs.password)
    form.set('roleId', userAttrs.roleId)
    if (userAttrs.email) {
      form.set('email', userAttrs.email)
    }
    if (userAttrs.phone) {
      form.set('phone', userAttrs.phone)
    }
    if (mapIcon) {
      form.set('icon', mapIcon, mapIcon.name)
    }
    return this.http.post(`/api/users`, form)
  }

  deleteUser(userId: UserId): Promise<AxiosResponse> {
    return this.http.delete(`/api/users/${userId}`)
  }

  createDevice(deviceAttrs: DeviceCreateRequest): Promise<AxiosResponse<Device>> {
    return this.http.post(`/api/devices`, deviceAttrs)
  }

  deleteDevice(deviceId: Device['uid']): Promise<AxiosResponse<Device>> {
    return this.http.delete(`/api/devices/${deviceId}`)
  }

  listEvents(): Promise<Event[]> {
    return this.http.get('/api/events').then(x => x.data)
  }

  createEvent(mageEvent: MageEventCreateRequest): Promise<AxiosResponse<MageEvent>> {
    return this.http.post('/api/events', mageEvent)
  }

  readEvent(id: MageEventId): Promise<AxiosResponse<MageEventPopulated>> {
    return this.http.get(`/api/events/${id}`)
  }

  createForm(mageEventId: MageEventId, form: MageFormCreateRequest): Promise<AxiosResponse<MageForm>> {
    return this.http.post(`/api/events/${mageEventId}/forms`, form)
  }

  updateForm(mageEventId: MageEventId, form: MageForm): Promise<AxiosResponse<MageForm>> {
    return this.http.put(`/api/events/${mageEventId}/forms/${form.id}`, form)
  }

  archiveForm(mageEvent: MageEvent | MageEventPopulated, formId: MageFormId): Promise<AxiosResponse<MageForm>> {
    const form = mageEvent.forms.find(x => x.id === formId)
    if (!form) {
      throw new Error(`form ${formId} does not exist on event ${mageEvent.id}`)
    }
    const archived = { ...form, archived: true }
    return this.http.put(`/api/events/${mageEvent.id}/forms/${formId}`, archived)
  }

  saveMapIcon(filePath: string, eventId: MageEventId, formId: number): Promise<AxiosResponse<MapIcon>>
  saveMapIcon(filePath: string, eventId: MageEventId, formId: number, primaryValue: string): Promise<AxiosResponse<MapIcon>>
  saveMapIcon(filePath: string, eventId: MageEventId, formId: number, primaryValue: string, secondaryValue: string): Promise<AxiosResponse<MapIcon>>
  saveMapIcon(data: buffer.Buffer | NodeJS.ReadableStream, iconName: string, eventId: MageEventId, formId: number): Promise<AxiosResponse<MapIcon>>
  saveMapIcon(data: buffer.Buffer | NodeJS.ReadableStream, iconName: string, eventId: MageEventId, formId: number, primaryValue: string): Promise<AxiosResponse<MapIcon>>
  saveMapIcon(data: buffer.Buffer | NodeJS.ReadableStream, iconName: string, eventId: MageEventId, formId: number, primaryValue: string, secondaryValue: string): Promise<AxiosResponse<MapIcon>>
  /**
   * TODO: mage api should support a simple PUT with content-type header
   */
  saveMapIcon(...args: any[]): Promise<AxiosResponse<MapIcon>> {
    const [ data, iconName, eventId, formId, primary, variant ] = ((): [ data: Buffer | NodeJS.ReadableStream, iconName: string, eventId: MageEventId, formId: number, primary: string | undefined, variant: string | undefined ] => {
      if (typeof args[0] === 'string') {
        const [ filePath, eventId, formId, primary, variant ] = args
        const iconName = path.basename(filePath)
        const data = fs.createReadStream(filePath)
        return [ data, iconName, eventId, formId, primary, variant ]
      }
      return [ args[0], args[1], args[2], args[3], args[4], args[5] ]
    })()
    const primaryPath = primary ? `/${primary}` : ''
    const variantPath = primary && variant ? `/${variant}` : ''
    const form = new FormData()
    const blobDuck = createBlobDuck(data, iconName)
    form.set('icon', blobDuck, iconName)
    return this.http.postForm(`/api/events/${eventId}/icons/${formId}${primaryPath}${variantPath}`, form)
  }

  addParticipantToEvent(event: MageEventPopulated, participantId: UserId): Promise<AxiosResponse<any>> {
    const eventTeam = event.teams.find(x => x.teamEventId === event.id)!
    return this.http.post(`/api/teams/${eventTeam.id}/users`, { id: participantId })
  }

  async saveObservation(mod: ObservationMod, attachmentUploads?: AttachmentUpload[]): Promise<Observation> {
    attachmentUploads = attachmentUploads || []
    if (mod.id === null) {
      const newIdRes = await this.http.post(`/api/events/${mod.eventId}/observations/id`)
      const id = newIdRes.data.id as string
      mod.id = id
    }
    const savedObs = await this.http.put<Observation>(`/api/events/${mod.eventId}/observations/${mod.id}`, mod).then(x => x.data)
    for (const upload of attachmentUploads) {
      const [ savedAttachment ] = savedAttachmentForMod(upload.attachmentInfo, savedObs)
      if (!savedAttachment) {
        throw new Error(`no saved attachment matches upload id ${upload.attachmentInfo.id} on observation ${savedObs.id}`)
      }
      await this.saveAttachmentContent(upload.attachmentContent(), savedAttachment, savedObs)
    }
    return await this.readObservation(savedObs.eventId, savedObs.id)
  }

  saveAttachmentContent(content: NodeJS.ReadableStream, attachment: Attachment, observation: Observation): Promise<Attachment> {
    const form = new FormData()
    const blobDuck = createBlobDuck(content, String(attachment.name), attachment.contentType)
    form.set('attachment', blobDuck, blobDuck.name)
    return this.http.put(
      `/api/events/${observation.eventId}/observations/${observation.id}/attachments/${attachment.id}`, form)
      .then(x => x.data)
  }

  readObservations(eventId: MageEventId): Promise<Observation[]> {
    return this.http.get<Observation[]>(`/api/events/${eventId}/observations`).then(x => x.data)
  }

  readObservation(eventId: MageEventId, observationId: ObservationId): Promise<Observation> {
    return this.http.get<Observation>(`/api/events/${eventId}/observations/${observationId}`).then(x => x.data)
  }

  postUserLocations(eventId: number, locations: Array<[lon: number, lat: number, timestamp?: number | undefined]>): Promise<AxiosResponse<UserLocation[]>> {
    const features = locations.map<geojson.Feature<geojson.Point>>(([ lon, lat, timestamp ]) => {
      if (typeof timestamp !== 'number') {
        timestamp = Date.now()
      }
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [ lon, lat ]
        },
        properties: {
          timestamp: new Date(timestamp).toISOString(),
          accuracy: 1
        }
      }
    })
    return this.http.post(`/api/events/${eventId}/locations`, features)
  }

  startExport(eventId: MageEventId, opts: ExportOptions): Promise<ExportInfo> {
    const optsJson: ExportRequestJson = {
      ...opts,
      eventId,
      startDate: opts.startDate?.toISOString(),
      endDate: opts.endDate?.toISOString(),
    }
    return this.http.post<ExportInfo>(`/api/exports`, optsJson).then(x => x.data)
  }

  readAllExports(): Promise<ExportInfo[]> {
    return this.http.get<ExportInfo[]>('/api/exports').then(x => x.data)
  }

  readMyExports(): Promise<ExportInfo[]> {
    return this.http.get<ExportInfo[]>('/api/exports/myself').then(x => x.data)
  }

  downloadExport(exportId: ExportId): Promise<NodeJS.ReadableStream> {
    return this.http.get<NodeJS.ReadableStream>(`/api/exports/${exportId}`, { responseType: 'stream' }).then(x => x.data)
  }

  /**
   * Wait for the given export to complete.  The request user must have
   * permission to access the export, i.e., they created the export or have
   * admin priveleges.  Resolve to `null` if no export for the given ID exists.
   * Resolve to an `ExportTimeoutError` if timeout passes before the export
   * completes or fails.
   */
  waitForMyExport(id: ExportId, timeoutMillis: number = 5000): Promise<ExportInfo | null | ExportTimeoutError> {
    const start = Date.now()
    return new Promise<ExportInfo>(function tryAgain(this: MageClientSession, resolve: any, reject: any): void {
      this.readMyExports().then(exports => {
        const exportInfo = exports.find(x => x.id === id)
        if (!exportInfo) {
          return resolve(null)
        }
        if (Date.now() - start > timeoutMillis) {
          return resolve(new ExportTimeoutError(exportInfo, `timed out after ${timeoutMillis}ms waiting for export ${id}`))
        }
        if (exportInfo.status === ExportStatus.Completed || exportInfo.status === ExportStatus.Failed) {
          return resolve(exportInfo)
        }
        setTimeout(() => tryAgain.bind(this)(resolve, reject), 150)
      })
    }.bind(this))
  }
}

/**
 *
 * Looks and quacks like a Blob.  A hack from https://github.com/nodejs/undici/issues/2202#issuecomment-1664134203
 * to create an object that _looks_ like a Blob that Axios can consume.
 * Could maybe also use `form-data` package which should except Node streams
 * natively, but not sure if that works with Axios.
 */
export function createBlobDuck(source: NodeJS.ReadableStream | buffer.Buffer, name: string, contentType?: string): BlobDuck {
  return {
    name,
    type: contentType || 'application/octet-stream',
    stream(): web_streams.ReadableStream {
      if (source instanceof buffer.Buffer) {
        source = Readable.from(source)
      }
      return Readable.toWeb(Readable.from(source))
    },
    [Symbol.toStringTag]: 'File',
  } as any
}

export interface BlobDuck extends globalThis.Blob {}

export type ISODateString = string

export interface SignInResult {
  token: string
  expirationDate: string
  user: User
  device?: Device | null
  api: any
}

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
  id: string
  uid: string
  description?: string
  userId: string
  userAgent?: string
  appVersion?: string
}

export type DeviceCreateRequest = Omit<Device, 'id'>

export type RootUserSetupRequest = Omit<UserCreateRequest, 'roleId'> & Pick<Device, 'uid'>

export enum AuthenticationStrategy {
  Local = 'local',
  OpenIDConnect = 'oidc',

}

export type AuthenticationProviderId = 'string'

export interface AuthenticationProvider<Settings = any> {
  _id: string
  name: string
  type: AuthenticationStrategy
  title: string
  textColor: null | string,
  buttonColor: null | string,
  icon: null | any,
  settings: Settings
  lastUpdated: ISODateString,
  enabled: true,
  isDirty: true
}

export interface LocalAuthenticationProviderSettings {
  passwordPolicy: {
    passwordHistoryCountEnabled: boolean
    passwordHistoryCount: number
    helpTextTemplate: {
      passwordHistoryCount: string
      passwordMinLength: string
      restrictSpecialChars: string
      specialChars: string
      numbers: string
      highLetters: string
      lowLetters: string
      maxConChars: string
      minChars: string
    }
    helpText: string,
    customizeHelpText: boolean,
    passwordMinLengthEnabled: boolean,
    passwordMinLength: number,
    restrictSpecialChars: string,
    restrictSpecialCharsEnabled: boolean,
    specialChars: number,
    specialCharsEnabled: boolean,
    numbers: number,
    numbersEnabled: boolean,
    highLetters: number,
    highLettersEnabled: boolean,
    lowLetters: number,
    lowLettersEnabled: boolean,
    maxConChars: number
    maxConCharsEnabled: boolean
    minChars: number
    minCharsEnabled: boolean
  }
  accountLock: {
    enabled: boolean,
    threshold: number,
    interval: number
  }
  devicesReqAdmin: {
    enabled: boolean
  }
  usersReqAdmin: {
    enabled: boolean
  }
  newUserTeams: [],
  newUserEvents: []
}

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

export type MageEventPopulated = Omit<MageEvent, 'teamIds'> & {
  teams: Team[]
}

export type MageEventId = number

export interface Team {
  id: string
  name: string
  description?: string
  teamEventId?: null | MageEventId
  userIds: UserId[]
  acl: any
}

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

export type AttachmentMod = Partial<Omit<Attachment, 'observationFormId'>> & {
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

export interface UserLocation extends geojson.Feature<geojson.Point, UserLocationFeatureProperties> {
  eventId: MageEventId
  userId: UserId
  teamIds: Team['id'][]
}

export interface UserLocationFeatureProperties {
  devicedId?: Device['uid']
}

export interface ExportInfo {
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
  /**
   * Unintuitively, `attachments: true` will EXCLUDE attachments from the
   * export.
   */
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
  constructor(readonly exportInfo: ExportInfo, message: string) {
    super(message)
  }
}
