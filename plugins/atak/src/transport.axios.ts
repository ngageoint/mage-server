import axios from 'axios'
import { URL } from 'url'
import { AtakTransport, AtakRequest, AtakResponse, AtakAuth } from './atak'

export class AxiosAtakTransport implements AtakTransport {

  async send(req: AtakRequest, baseUrl: URL, auth?: AtakAuth): Promise<AtakResponse> {

    const fullUrl = new URL(req.path, baseUrl)
    if (req.method !== 'get') {
      throw new Error('only get is supported')
    }

    const basicAuth = auth?.type === 'basic' ? { username: auth.username, password: auth.password } : undefined
    // OpenTAKServer accepts its auth token via the Authentication-Token header.
    const headers = auth?.type === 'token' ? { 'Authentication-Token': auth.token } : undefined

    const res = await axios.get(fullUrl.toString(), {
      params: req.queryParams,
      ...(basicAuth ? { auth: basicAuth } : {}),
      ...(headers ? { headers } : {})
    })
    return {
      status: res.status,
      body: res.data
    }
  }
}
