import axios from 'axios'
import { URL } from 'url'
import { TakTransport, TakRequest, TakResponse, TakAuth } from './tak'

export class AxiosTakTransport implements TakTransport {

  async send(req: TakRequest, baseUrl: URL, auth?: TakAuth): Promise<TakResponse> {

    const fullUrl = new URL(req.path, baseUrl)
    if (req.method === 'get') {
      const res = await axios.get(fullUrl.toString(), {
        params: req.queryParams,
        ...(auth ? { auth } : {})
      })
      return {
        status: res.status,
        body: res.data
      }
    }
    throw new Error('only get is supported')
  }
}
