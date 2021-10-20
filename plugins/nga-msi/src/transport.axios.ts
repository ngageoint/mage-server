import axios from 'axios'
import { URL } from 'url'
import { MsiTransport, MsiRequest, MsiResponse } from './nga-msi'

export class AxiosMsiTransport implements MsiTransport {

  async send(req: MsiRequest, baseUrl: URL): Promise<MsiResponse> {

    const fullUrl = new URL(req.path, baseUrl)
    if (req.method === 'get') {
      const res = await axios.get(fullUrl.toString(), { params: req.queryParams })
      return {
        status: res.status,
        body: res.data
      }
    }
    throw new Error('only get is supported')
  }
}