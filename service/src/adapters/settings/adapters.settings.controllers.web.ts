import express from 'express'
import { WebAppRequestFactory } from '../adapters.controllers.web'
import { GetSettingsServices, UpdateMapSettingsRequest, UpdateSettingsServices } from '../../app.api/settings/app.api.settings'
import { MobileSearchType, WebSearchType } from '../../entities/settings/entities.settings'
import { URL } from 'url'

export interface SettingsAppLayer {
  getMapSettings: GetSettingsServices,
  updateMapSettings: UpdateSettingsServices
}

function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch (e) { return false }
}

export function SettingsRoutes(app: SettingsAppLayer, createAppRequest: WebAppRequestFactory) {
  const routes = express.Router()
  routes.use(express.json())

  routes.route('/map')
    .get(async (req, res) => {
      const appReq = createAppRequest(req)
      const appRes = await app.getMapSettings(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      } else {
        return res.sendStatus(404)
      }
    })

  routes.route('/map')
    .post(async (req, res) => {
      const {
        webSearchType: webSearchTypeParameter,
        mobileSearchType: mobileSearchTypeParameter,
        webNominatimUrl,
        mobileNominatimUrl
      } = req.body

      const webSearchType = WebSearchType[webSearchTypeParameter as keyof typeof WebSearchType]
      if (!webSearchType) {
        return res.status(400).json({ message: 'Web search option is required.' })
      }

      const mobileSearchType = MobileSearchType[mobileSearchTypeParameter as keyof typeof MobileSearchType]
      if (!mobileSearchType) {
        return res.status(400).json({ message: 'Mobile search option is required.' })
      }

      if (webSearchType === WebSearchType.NOMINATIM) {
        if (!validateUrl(webNominatimUrl)) {
          return res.status(400).json({ message: 'Web Nominatim URL is required and must be a valid URL.' })
        }
      }

      if (mobileSearchType === MobileSearchType.NOMINATIM) {
        if (!validateUrl(mobileNominatimUrl)) {
          return res.status(400).json({ message: 'Mobile Nominatim URL is required and must be a vaild URL.' })
        }
      }

      const settings: UpdateMapSettingsRequest['settings'] = {
        webSearchType: webSearchType,
        webNominatimUrl: req.body.webNominatimUrl,
        mobileSearchType: mobileSearchType,
        mobileNominatimUrl: req.body.mobileNominatimUrl
      }

      const appReq: UpdateMapSettingsRequest = createAppRequest(req, { settings })

      const appRes = await app.updateMapSettings(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      } else {
        return res.sendStatus(400)
      }
    })

  return routes
}