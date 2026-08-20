import { ArcGISIdentityManager, ArcGISRequestError } from "@esri/arcgis-rest-request";
import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { FeatureServiceConfig, FeatureLayerConfig } from './types/ArcGISConfig';
import { ArcGISPluginConfig } from './types/ArcGISPluginConfig';
import { ArcGISIdentityService } from './ArcGISService';
import { checkEditPrivilege } from './PortalDiscovery';

export const sanitizeFeatureService = async (
  config: FeatureServiceConfig,
  identityService: ArcGISIdentityService,
  console: Console
): Promise<Omit<FeatureServiceConfig & { authenticated: boolean, mayLackEditPrivilege?: boolean }, 'identityManager'>> => {
  let authenticated = false;
  let mayLackEditPrivilege: boolean | undefined;
  try {
    const identityManager = await identityService.signin(config);
    authenticated = true;
    if (config.portalUrl) {
      mayLackEditPrivilege = await checkEditPrivilege(config.portalUrl, identityManager, console);
    }
  } catch (error) {
    console.error('Error in sanitizeFeatureService');
    if (error instanceof ArcGISRequestError) {
      console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error.response?.error?.details || "<unknown>"}`);
    }
  }

  const { identityManager, ...sanitized } = config;
  return { ...sanitized, authenticated, mayLackEditPrivilege };
};

/**
 * Add or update a feature service in the plugin configuration and return the sanitized result.
 * @param patchConfig persists the updated configuration (typically ObservationProcessor.patchConfig)
 * @param identityService the identity service, used to verify the feature service is reachable
 * @param config the current plugin configuration
 * @param url the feature service url
 * @param portalUrl the ArcGIS portal API url, if any
 * @param identityManager authenticated identity to associate with the feature service
 * @param console used to log messages
 */
export const commitFeatureService = async (
  patchConfig: (config: ArcGISPluginConfig) => Promise<unknown>,
  identityService: ArcGISIdentityService,
  config: ArcGISPluginConfig,
  url: string,
  portalUrl: string | undefined,
  identityManager: ArcGISIdentityManager,
  console: Console
) => {
  const existingService = config.featureServices.find(service => service.url === url);
  let service: FeatureServiceConfig;
  if (existingService) {
    existingService.identityManager = identityManager.serialize();
    if (portalUrl) {
      existingService.portalUrl = portalUrl;
    }
    service = existingService;
  } else {
    service = { url, portalUrl, layers: [], identityManager: identityManager.serialize() };
    config.featureServices.push(service);
  }
  await patchConfig(config);
  return sanitizeFeatureService(service, identityService, console);
};

export type IncomingFeatureServiceConfig = {
  url: string
  portalUrl?: string
  layers: Array<{ layer: string | number, geometryType?: string, events?: string[] }>
}

/**
 * Builds the FeatureServiceConfig[] to persist from what the client submitted when saving event/layer
 * selections: translates each layer's event *names* to the numeric event ids MAGE uses internally, and
 * carries forward the identityManager already persisted for a matching existing service (the client
 * never sends it back, since selecting layers doesn't involve re-authenticating).
 * @param updatedServices the feature services as submitted by the client
 * @param existingFeatureServices the currently persisted feature services, for identityManager continuity
 * @param eventNameToIdMap a lookup of current MAGE event name -> id
 */
export const buildFeatureServicesForSave = (
  updatedServices: IncomingFeatureServiceConfig[],
  existingFeatureServices: FeatureServiceConfig[],
  eventNameToIdMap: Map<string, MageEventId>
): FeatureServiceConfig[] => {
  return updatedServices.map((updateService) => {
    const existingService = existingFeatureServices.find(featureService => featureService.url === updateService.url);

    const layers: FeatureLayerConfig[] = updateService.layers.map((layer) => {
      const eventNames = layer.events || [];
      const eventIds = eventNames
        .map(eventName => eventNameToIdMap.get(eventName))
        .filter((id): id is MageEventId => id !== undefined);

      return { ...layer, eventIds };
    });

    return {
      url: updateService.url,
      portalUrl: updateService.portalUrl,
      layers,
      // the client never sends this back - carry forward whatever was already persisted
      identityManager: existingService?.identityManager || ''
    };
  });
};
