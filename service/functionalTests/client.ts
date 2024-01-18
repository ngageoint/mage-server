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
    return await this.http.post('/api/setup', setup)
  }

  async listRoles(): Promise<AxiosResponse<Role[]>> {
    return await this.http.get<Role[]>('/api/roles')
  }

  async createUser(body: UserCreateRequest): Promise<AxiosResponse<any>> {
    return await this.http.post(`/api/users`, body)
  }

  async listEvents(): Promise<any> {
    const res = await this.http.get('/api/events')
    return res.data
  }

  async readEvent(id: number): Promise<any> {
    const res = await this.http.get(`/api/events/${id}`)
    return res.data
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
