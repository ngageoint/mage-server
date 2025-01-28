import { ArcGISIdentityManager } from '@esri/arcgis-rest-request';
import { FeatureServiceConfig } from './ArcGISConfig';
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api';
import { ArcGISPluginConfig } from './ArcGISPluginConfig';

/**
 * Interface for managing ArcGIS identity and authentication.
 */
export interface ArcGISIdentityService {
  /**
   * Sign in to ArcGIS with the feature service credentials.
   * @param {FeatureServiceConfig} featureService The feature service configuration.
   * @returns {Promise<ArcGISIdentityManager>} The ArcGIS identity manager.
   */
  signin(featureService: FeatureServiceConfig): Promise<ArcGISIdentityManager>

  /**
   * Update the identity managers with latest tokens.
   * @returns {Promise<void>}
   */
  updateIndentityManagers(): Promise<void>
}

/**
 * Creates a new ArcGIS identity service.
 * @param {PluginStateRepository<ArcGISPluginConfig>} stateRepo The plugin state repository.
 * @returns {ArcGISIdentityService} The ArcGIS identity service.
 */
export function createArcGISIdentityService(
  stateRepo: PluginStateRepository<ArcGISPluginConfig>
): ArcGISIdentityService {
  const identityManagerCache: Map<string, Promise<ArcGISIdentityManager>> = new Map();

  return {
    async signin(featureService: FeatureServiceConfig): Promise<ArcGISIdentityManager> {
      const cached = await identityManagerCache.get(featureService.url);
      if (!cached) {
        const identityManager = ArcGISIdentityManager.deserialize(featureService.identityManager);
        const promise = identityManager.getUser().then(() => identityManager);
        identityManagerCache.set(featureService.url, promise);
        return promise;
      } else {
        return cached;
      }
    },

    async updateIndentityManagers() {
      const config = await stateRepo.get() as ArcGISPluginConfig | null;
      for (const [url, persistedIdentityManagerPromise] of identityManagerCache) {
        const persistedIdentityManager = await persistedIdentityManagerPromise;
        const featureService: FeatureServiceConfig | undefined = config?.featureServices.find((service: FeatureServiceConfig) => service.url === url);
        if (featureService && config) {
          const identityManager = ArcGISIdentityManager.deserialize(featureService.identityManager);
          if (identityManager.token !== persistedIdentityManager.token || identityManager.refreshToken !== persistedIdentityManager.refreshToken) {
            featureService.identityManager = persistedIdentityManager.serialize();
            await stateRepo.patch(config as never);
          }
        }
      }
    }
  };
}

/**
 * Gets the portal URL for an ArcGIS feature service.
 * @param {FeatureServiceConfig | string} featureService The feature service config or URL.
 * @returns {string} The portal URL.
 */
export function getPortalUrl(featureService: FeatureServiceConfig | string): string {
  const url = getFeatureServiceUrl(featureService);
  return `https://${url.hostname}/arcgis/sharing/rest`;
}

/**
 * Gets the server URL for an ArcGIS feature service.
 * @param {FeatureServiceConfig | string} featureService The feature service config or URL.
 * @returns {string} The server URL.
 */
export function getServerUrl(featureService: FeatureServiceConfig | string): string {
  const url = getFeatureServiceUrl(featureService);
  return `https://${url.hostname}/arcgis`;
}

/**
 * Gets the URL object for an ArcGIS feature service.
 * @param {FeatureServiceConfig | string} featureService The feature service config or URL string.
 * @returns {URL} The feature service URL.
 */
export function getFeatureServiceUrl(featureService: FeatureServiceConfig | string): URL {
  const url = typeof featureService === 'string' ? featureService : featureService.url;
  return new URL(url);
}