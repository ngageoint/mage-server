import { ArcGISIdentityManager } from '@esri/arcgis-rest-request'
import { FeatureServiceConfig } from './ArcGISConfig'
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api'

export interface ArcGISIdentityService {
  signin(featureService: FeatureServiceConfig): Promise<ArcGISIdentityManager>
  updateIndentityManagers(): Promise<void>
}

export function createArcGISIdentityService(
  stateRepo: PluginStateRepository<any>
): ArcGISIdentityService {
  const identityManagerCache: Map<string, Promise<ArcGISIdentityManager>> = new Map()

  return {
    async signin(featureService: FeatureServiceConfig): Promise<ArcGISIdentityManager> {
      let cached = await identityManagerCache.get(featureService.url)
      if (!cached) {
        const identityManager = ArcGISIdentityManager.deserialize(featureService.identityManager)
        const promise = identityManager.getUser().then(() => identityManager)
        identityManagerCache.set(featureService.url, promise)
        return promise
      } else {
        return cached
      }
    },
    async updateIndentityManagers() {
      const config = await stateRepo.get()
      for (let [url, persistedIdentityManagerPromise] of identityManagerCache) {
        const persistedIdentityManager = await persistedIdentityManagerPromise
        const featureService: FeatureServiceConfig | undefined = config.featureServices.find((service: FeatureServiceConfig) => service.url === url)
        if (featureService) {
          const identityManager = ArcGISIdentityManager.deserialize(featureService.identityManager)
          if (identityManager.token !== persistedIdentityManager.token || identityManager.refreshToken !== persistedIdentityManager.refreshToken) {
            featureService.identityManager = persistedIdentityManager.serialize()
            await stateRepo.put(config)
          }
        }
      }
    }
  }
}

export function getPortalUrl(featureService: FeatureServiceConfig | string): string {
	const url = getFeatureServiceUrl(featureService)
  return `https://${url.hostname}/arcgis/sharing/rest`
}

export function getServerUrl(featureService: FeatureServiceConfig | string): string {
	const url = getFeatureServiceUrl(featureService)
  return `https://${url.hostname}/arcgis`
}

export function getFeatureServiceUrl(featureService: FeatureServiceConfig | string): URL {
  const url = typeof featureService === 'string' ? featureService : featureService.url
  return new URL(url)
}