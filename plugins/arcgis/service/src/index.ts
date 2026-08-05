import baseLog from '@ngageoint/mage.service/lib/logger';
import { InitPluginHook, PluginStateRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api'
import { GetAppRequestContext, WebRoutesHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.web'
import { ObservationRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.observations'
import { MageEventRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.events'
import { UserRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.users'
import { SettingPermission } from '@ngageoint/mage.service/lib/entities/authorization/entities.permissions'
import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { ObservationProcessor } from './ObservationProcessor'
import { ArcGISIdentityManager, ArcGISRequestError, request } from "@esri/arcgis-rest-request"
import { searchItems } from "@esri/arcgis-rest-portal"
import { FeatureServiceConfig, FeatureLayerConfig } from './types/ArcGISConfig'
import { ArcGISPluginConfig } from './types/ArcGISPluginConfig'
import { URL } from "node:url"
import express from 'express'
import { ArcGISIdentityService, createArcGISIdentityService, getPortalUrl } from './ArcGISService'

// scope every log message from this plugin under MAGE's central winston logger
// map console's method names to the child logger's methods explicitly
const arcgisLog = baseLog.child({ component: 'arcgis' });
const logMethodMap: Record<'log' | 'debug' | 'info' | 'warn' | 'error', (...args: unknown[]) => void> = {
  log: (...args) => arcgisLog.info(...args as [string, ...unknown[]]),
  debug: (...args) => arcgisLog.debug(...args as [string, ...unknown[]]),
  info: (...args) => arcgisLog.info(...args as [string, ...unknown[]]),
  warn: (...args) => arcgisLog.warn(...args as [string, ...unknown[]]),
  error: (...args) => arcgisLog.error(...args as [string, ...unknown[]]),
};
const logOverrides = (Object.keys(logMethodMap) as (keyof typeof logMethodMap)[]).reduce((overrides, fn) => {
  return {
    ...overrides,
    [fn]: {
      writable: false,
      value: (...args: unknown[]) => {
        logMethodMap[fn](...args);
      }
    }
  } as PropertyDescriptorMap;
}, {} as PropertyDescriptorMap);
const console = Object.create(globalThis.console, logOverrides) as Console;

type InjectedServices = {
  stateRepo: typeof PluginStateRepositoryToken,
  eventRepo: typeof MageEventRepositoryToken,
  obsRepoForEvent: typeof ObservationRepositoryToken,
  userRepo: typeof UserRepositoryToken
};

const pluginWebRoute = "plugins/@ngageoint/mage.arcgis.service";

const describeArcGISError = (err: unknown): string => {
  if (err instanceof ArcGISRequestError) {
    return `${err.message}${err.response?.error?.message ? ` (${err.response.error.message})` : ''}`;
  }
  return err instanceof Error ? err.message : String(err);
};

const sanitizeFeatureService = async (config: FeatureServiceConfig, identityService: ArcGISIdentityService): Promise<Omit<FeatureServiceConfig & { authenticated: boolean }, 'identityManager'>> => {
  let authenticated = false;
  try {
    await identityService.signin(config);
    authenticated = true;
  } catch (error) {
    console.error('Error in sanitizeFeatureService');
    if (error instanceof ArcGISRequestError) {
      console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error.response?.error?.details || "<unknown>"}`);
    }
  }

  const { identityManager, ...sanitized } = config;
  return { ...sanitized, authenticated };
};

type DiscoveredFeatureService = {
  id: string
  title: string
  url: string
  owner: string
  // undefined if the service's own definition couldn't be fetched, meaning read-only status is unknown
  capabilities?: string
  permission: string
}

type DiscoveredFeatureServicesPage = {
  services: DiscoveredFeatureService[]
  total: number
  start: number
  num: number
}

/**
 * Search a portal for feature services accessible to the given identity, sorted alphabetically by title.
 * @param identityManager authenticated identity to search the portal with
 * @param start 1-based index of the first result to return, per the ArcGIS REST paging convention
 * @param num number of results to return
 * @param titleFilter if provided, restricts results to services whose title starts with this text
 * @returns a page of feature services available to that identity, and the total count across all pages
 */
const discoverFeatureServices = async (identityManager: ArcGISIdentityManager, start = 1, num = 100, titleFilter?: string): Promise<DiscoveredFeatureServicesPage> => {
  const sanitizedFilter = titleFilter?.replace(/["*:]/g, '').trim();
  // a trailing-only wildcard (prefix match) is used because leading wildcards are not reliably
  // supported by the portal's search index and can cause the filter clause to be silently ignored
  const q = sanitizedFilter ? `type:"Feature Service" AND title:${sanitizedFilter}*` : 'type:"Feature Service"';
  const result = await searchItems({
    q,
    authentication: identityManager,
    sortField: 'title',
    sortOrder: 'asc',
    start,
    num
  });
  const services = await Promise.all(result.results
    .filter((item): item is typeof item & { url: string } => !!item.url)
    .map(async (item) => {
      // the portal search result doesn't include capabilities, so fetch each service's own
      // definition to find out whether it allows editing before the user selects it
      let capabilities: string | undefined;
      try {
        const response = await request(item.url, { authentication: identityManager });
        capabilities = response.capabilities;
      } catch (err) {
        console.error(`Could not get capabilities for discovered feature service ${item.url}: ${describeArcGISError(err)}`);
      }

      const serviceHasEditCapability = !!capabilities?.split(',').some(c => ['Create', 'Update', 'Delete', 'Editing'].includes(c));

      return {
        id: item.id,
        title: item.title,
        url: item.url,
        owner: item.owner,
        capabilities,
        permission: serviceHasEditCapability ? '' : 'Read only'
      };
    }));
  return { services, total: result.total, start, num };
};

/**
 * Add or update a feature service in the plugin configuration and return the sanitized result.
 * @param processor the observation processor, used to persist the updated configuration
 * @param identityService the identity service, used to verify the feature service is reachable
 * @param config the current plugin configuration
 * @param url the feature service url
 * @param portalUrl the ArcGIS portal API url, if any
 * @param identityManager authenticated identity to associate with the feature service
 */
const commitFeatureService = async (
  processor: ObservationProcessor,
  identityService: ArcGISIdentityService,
  config: ArcGISPluginConfig,
  url: string,
  portalUrl: string | undefined,
  identityManager: ArcGISIdentityManager
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
  await processor.patchConfig(config);
  return sanitizeFeatureService(service, identityService);
};

/**
 * The MAGE ArcGIS Plugin finds new MAGE observations and if configured to send the observations
 * to an ArcGIS server, it will then transform the observation to an ArcGIS feature and
 * send them to the configured ArcGIS feature layer.
 */
const arcgisPluginHooks: InitPluginHook<InjectedServices> = {
  inject: {
    stateRepo: PluginStateRepositoryToken,
    eventRepo: MageEventRepositoryToken,
    obsRepoForEvent: ObservationRepositoryToken,
    userRepo: UserRepositoryToken
  },
  init: async (services): Promise<WebRoutesHooks> => {
    console.info('Intializing ArcGIS plugin...');
    const { stateRepo, eventRepo, obsRepoForEvent, userRepo } = services;

    const identityService = createArcGISIdentityService(stateRepo);
    const processor = new ObservationProcessor(stateRepo, eventRepo, obsRepoForEvent, userRepo, identityService, console);
    // don't block server startup on the first ArcGIS sync cycle, which can involve
    // several rounds of network I/O against the configured ArcGIS server(s)
    processor.start().catch((err) => console.error(`Error starting ArcGIS observation processor: ${describeArcGISError(err)}`));
    return {
      webRoutes: {
        public: () => {
          const routes = express.Router().use(express.json());

          routes.get('/oauth/signin', async (req, res) => {
            const discover = req.query.discover === 'true';
            const url = req.query.featureServiceUrl as string;
            const portalUrl = req.query.portalUrl as string;

            if (discover) {
              if (!portalUrl) {
                return res.status(404).send('portalUrl is required to discover feature services');
              }
            } else if (!URL.canParse(url)) {
              return res.status(404).send('invalid feature service url');
            }

            const clientId = req.query.clientId as string;
            if (!clientId) {
              return res.status(404).send('clientId is required');
            }

            const config = await processor.safeGetConfig();
            ArcGISIdentityManager.authorize({
              clientId,
              portal: discover ? portalUrl : (portalUrl || getPortalUrl(url)),
              redirectUri: `${config.baseUrl}/${pluginWebRoute}/oauth/authenticate`,
              state: JSON.stringify({ url, clientId, portalUrl, discover })
            }, res);
          });

          routes.get('/oauth/authenticate', async (req, res) => {
            const code = req.query.code as string;
            let state: { url: string, clientId: string, portalUrl?: string, discover?: boolean };
            try {
              const { url, clientId, portalUrl, discover } = JSON.parse(req.query.state as string);
              state = { url, clientId, portalUrl, discover };
            } catch (err) {
              console.error('error parsing relay state', err);
              return res.sendStatus(500);
            }

            const config = await processor.safeGetConfig();
            const creds = {
              clientId: state.clientId,
              redirectUri: `${config.baseUrl}/${pluginWebRoute}/oauth/authenticate`,
              portal: state.discover ? (state.portalUrl as string) : (state.portalUrl || getPortalUrl(state.url))
            };
            const postMessageResponse = (data: unknown) => {
              res.send(`
                <html>
                  <head>
                    <script>
                      window.opener.postMessage(${JSON.stringify(data)}, '${req.protocol}://${req.headers.host}');
                    </script>
                  </head>
                </html>
              `);
            };
            ArcGISIdentityManager.exchangeAuthorizationCode(creds, code).then(async (idManager: ArcGISIdentityManager) => {
              if (state.discover) {
                const page = await discoverFeatureServices(idManager);
                postMessageResponse({ identityManager: idManager.serialize(), portalUrl: state.portalUrl, ...page });
                return;
              }

              let service = config.featureServices.find(service => service.url === state.url);
              if (!service) {
                service = {
                  url: state.url,
                  portalUrl: state.portalUrl,
                  identityManager: idManager.serialize(),
                  layers: []
                };
              } else {
                service.identityManager = idManager.serialize();
                if (state.portalUrl) {
                  service.portalUrl = state.portalUrl;
                }
              }

              config.featureServices.push(service);

              await processor.putConfig(config);
              const sanitizedService = await sanitizeFeatureService(service, identityService);
              postMessageResponse(sanitizedService);
            }).catch((error) => res.status(400).json(error));
          });

          return routes;
        },
        protected: (requestContext: GetAppRequestContext) => {
          const routes = express.Router()
            .use(express.json())
            .use(async (req, res, next) => {
              const context = requestContext(req);
              const user = context.requestingPrincipal();
              if (!user.role.permissions.find(x => x === SettingPermission.UPDATE_SETTINGS)) {
                return res.status(403).json({ message: 'unauthorized' });
              }
              next();
            });

          routes.route('/config')
            .get(async (req, res) => {
              console.info('Getting ArcGIS plugin config...');
              const config = await processor.safeGetConfig();
              const { featureServices, ...remaining } = config;

              const sanitizeFeatureServices = await Promise.all(
                featureServices.map(async (service) => await sanitizeFeatureService(service, identityService))
              );

              res.json({ ...remaining, featureServices: sanitizeFeatureServices });
            })
            .put(async (req, res) => {
              console.info('Applying ArcGIS plugin config...');
              const config = await stateRepo.get();
              const { featureServices: updatedServices, ...updateConfig } = req.body;


              // Convert event names to event IDs
              // Fetch all events and create a mapping of event names to event IDs
              const allEvents = await eventRepo.findAll();
              const eventNameToIdMap = new Map<string, MageEventId>();
              allEvents.forEach(event => {
                eventNameToIdMap.set(event.name, event.id);
              });

              // Process the incoming feature services with eventIds instead of event names
              const featureServices: FeatureServiceConfig[] = updatedServices.map((updateService: any) => {
                const existingService = config.featureServices.find(
                  (featureService: FeatureServiceConfig) => featureService.url === updateService.url
                );

                // Process layers
                const layers: FeatureLayerConfig[] = updateService.layers.map((layer: any) => {
                  // Extract event names from the incoming layer data
                  const eventNames: string[] = layer.events || [];

                  // Convert event names to event IDs using the mapping
                  const eventIds = eventNames
                    .map(eventName => eventNameToIdMap.get(eventName))
                    .filter((id): id is MageEventId => id !== undefined);

                  // Construct the FeatureLayerConfig with eventIds
                  const featureLayerConfig: FeatureLayerConfig = {
                    ...layer,
                    eventIds: eventIds
                  };

                  return featureLayerConfig;
                });

                return {
                  url: updateService.url,
                  portalUrl: updateService.portalUrl,
                  layers: layers,
                  // Map existing identityManager, client does not send this
                  identityManager: existingService?.identityManager || '',
                };
              });

              await stateRepo.patch({ ...updateConfig, featureServices });

              // Sync configuration with feature servers by restarting observation processor
              processor.stop();
              await processor.start();

              res.status(200).json({ success: true });
            });

          routes.post('/featureService/validate', async (req, res) => {
            const config = await processor.safeGetConfig();
            const { url, portalUrl, token, username, password } = req.body;
            if (!URL.canParse(url)) {
              return res.status(400).send('Invalid feature service url');
            }

            try {
              let identityManager: ArcGISIdentityManager;
              if (token) {
                identityManager = await ArcGISIdentityManager.fromToken({ token });
              } else if (username && password) {
                const serverRoot = url.split(/\/rest\/services/i)[0];
                const { owningSystemUrl } = await request(`${serverRoot}/rest/info`);
                if (owningSystemUrl || portalUrl) {
                  identityManager = await ArcGISIdentityManager.signIn({
                    username,
                    password,
                    portal: portalUrl || `${owningSystemUrl}/sharing/rest`
                  });
                } else {
                  // stand-alone ArcGIS Server with no portal; sign in to the server's own token service
                  identityManager = new ArcGISIdentityManager({ username, password, server: serverRoot });
                  await identityManager.refreshCredentials();
                }
              } else {
                return res.sendStatus(400);
              }

              const service: FeatureServiceConfig = { url, portalUrl, layers: [], identityManager: identityManager.serialize() };
              const existingService = config.featureServices.find(service => service.url === url);
              if (!existingService) {
                config.featureServices.push(service);
              }

              await processor.patchConfig(config);
              const sanitized = await sanitizeFeatureService(service, identityService);
              return res.send(sanitized);
            } catch (err) {
              return res.status(400).send('Invalid credentials provided to communicate with feature service' + err);
            }
          });

          routes.post('/featureService/discover', async (req, res) => {
            const { portalUrl, token, username, password, identityManager: serializedIdentityManager, start, num, filter } = req.body;
            if (!portalUrl) {
              return res.status(400).send('portalUrl is required');
            }

            try {
              let identityManager: ArcGISIdentityManager;
              if (serializedIdentityManager) {
                identityManager = ArcGISIdentityManager.deserialize(serializedIdentityManager);
              } else if (token) {
                identityManager = await ArcGISIdentityManager.fromToken({ token, portal: portalUrl });
              } else if (username && password) {
                identityManager = await ArcGISIdentityManager.signIn({ username, password, portal: portalUrl });
              } else {
                return res.sendStatus(400);
              }

              const page = await discoverFeatureServices(identityManager, start, num, filter);
              return res.send({ identityManager: identityManager.serialize(), portalUrl, ...page });
            } catch (err) {
              return res.status(400).send('Invalid credentials provided to communicate with portal' + err);
            }
          });

          routes.post('/featureService/confirm', async (req, res) => {
            const { url, portalUrl, identityManager: serializedIdentityManager } = req.body;
            if (!URL.canParse(url)) {
              return res.status(400).send('Invalid feature service url');
            }
            if (!serializedIdentityManager) {
              return res.sendStatus(400);
            }

            try {
              const identityManager = ArcGISIdentityManager.deserialize(serializedIdentityManager);
              const config = await processor.safeGetConfig();
              const sanitized = await commitFeatureService(processor, identityService, config, url, portalUrl, identityManager);
              return res.send(sanitized);
            } catch (err) {
              return res.status(400).send('Invalid credentials provided to communicate with feature service' + err);
            }
          });

          routes.delete('/featureService', async (req, res) => {
            const url = req.query.featureServiceUrl as string;
            const config = await processor.safeGetConfig();
            const featureService = config.featureServices.find(featureService => featureService.url === url);
            if (!featureService) {
              return res.sendStatus(204);
            }

            // only remove services with no layers configured yet, so this can't be used to drop a
            // real, already-configured feature service - just the placeholder created by validate/
            // confirm before the user picks layers and saves, e.g. when they close the dialog first
            if (featureService.layers.length > 0) {
              return res.status(409).send('Feature service has configured layers and cannot be removed this way');
            }

            config.featureServices = config.featureServices.filter(service => service.url !== url);
            await processor.patchConfig(config);
            return res.sendStatus(204);
          });

          routes.get('/featureService/layers', async (req, res) => {
            const url = req.query.featureServiceUrl as string;
            const config = await processor.safeGetConfig();
            const featureService = config.featureServices.find(featureService => featureService.url === url);
            if (!featureService) {
              return res.status(400);
            }

            try {
              const identityManager = await identityService.signin(featureService);
              const response = await request(url, {
                authentication: identityManager
              });

              // the FeatureServer root response only includes a lightweight summary per layer
              // (no capabilities); fetch each layer's own definition to get its actual capabilities,
              // falling back to the service-wide capabilities if the layer doesn't report its own
              const layers = await Promise.all(response.layers.map(async (layer: { id: number, capabilities?: string }) => {
                try {
                  const layerInfo = await request(`${url}/${layer.id}`, { authentication: identityManager });
                  return { ...layer, capabilities: layerInfo.capabilities || response.capabilities };
                } catch (err) {
                  console.error(`Could not get capabilities for layer ${layer.id}: ${describeArcGISError(err)}`);
                  return { ...layer, capabilities: response.capabilities };
                }
              }));

              res.send(layers);
            } catch (err) {
              const message = describeArcGISError(err);
              console.error(message);
              res.status(500).json({ message: 'Could not get ArcGIS layer info', error: message });
            }
          });

          routes.get('/featureService/capabilities', async (req, res) => {
            const url = req.query.featureServiceUrl as string;
            const config = await processor.safeGetConfig();
            const featureService = config.featureServices.find(featureService => featureService.url === url);
            if (!featureService) {
              return res.status(400);
            }

            try {
              const identityManager = await identityService.signin(featureService);
              const response = await request(url, {
                authentication: identityManager
              });
              res.send({ capabilities: response.capabilities });
            } catch (err) {
              const message = describeArcGISError(err);
              console.error(message);
              res.status(500).json({ message: 'Could not get ArcGIS feature service capabilities', error: message });
            }
          });

          return routes;
        }
      }
    };
  }
};

export = arcgisPluginHooks