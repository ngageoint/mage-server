import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { URLSearchParams } from 'url'

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

  async createEvent(body: MageEventCreateRequest): Promise<AxiosResponse<MageEvent>> {
    return await this.http.post('/api/events', body)
  }

  async readEvent(id: number): Promise<AxiosResponse<MageEvent>> {
    return await this.http.get(`/api/events/${id}`)
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
  passwordconfirm: string
}

export interface UserPhone {
  type: string
  number: string
}

export interface User {
  id: string
  username: string
  displayName: string
  email?: string
  phones: UserPhone[]
  roleId: string
}

export interface Device {
  uid: string
  description?: string
  userId: string
  userAgent?: string
  appVersion?: string
}

export type RootUserSetupRequest = Omit<UserCreateRequest, 'passwordconfirm' | 'roleId'> & Pick<Device, 'uid'>

export interface MageEvent {
  id: number
  name: string
  description?: string
  style: LineStyle
  forms: MageForm[]
  teamIds: string[]
  layerIds: string[]
  feedIds: string[]
}

export interface MageForm {
  id: number
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

/**
 * This is and related style types are copies from the core MAGE service
 * entity types.
 */
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

export type MageEventCreateRequest = Omit<MageEvent, 'id'>

export type MageEventUpdateRequest = MageEvent
