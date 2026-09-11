import baseLog from '@ngageoint/mage.service/lib/logger';
import { InitPluginHook, PluginStateRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api'
import { GetAppRequestContext, WebRoutesHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.web'
import { ObservationRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.observations'
import { MageEventRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.events'
import { UserRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.users'
import { SettingPermission } from '@ngageoint/mage.service/lib/entities/authorization/entities.permissions'
import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { ObservationProcessor } from './ObservationProcessor'
import { ArcGISIdentityManager, request } from "@esri/arcgis-rest-request"
import { FeatureServiceConfig } from './types/ArcGISConfig'
import { URL } from "node:url"
import express from 'express'
import { createArcGISIdentityService, getPortalUrl } from './ArcGISService'
import {
  checkEditPrivilege,
  describeArcGISError,
  describeAuthFailure,
  discoverFeatureServices,
  discoverWithPortalCandidates,
  signInWithPortalCandidates
} from './PortalDiscovery'
import { buildFeatureServicesForSave, commitFeatureService, sanitizeFeatureService } from './FeatureServiceConfigStore'
import { serializeAndEncrypt } from './CredentialEncryption'

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

    const identityService = createArcGISIdentityService(stateRepo, console);
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
                const mayLackEditPrivilege = state.portalUrl ? await checkEditPrivilege(state.portalUrl, idManager, console) : undefined;
                const page = await discoverFeatureServices(idManager, console);
                postMessageResponse({ identityManager: idManager.serialize(), portalUrl: state.portalUrl, mayLackEditPrivilege, ...page });
                return;
              }

              let service = config.featureServices.find(service => service.url === state.url);
              if (!service) {
                service = {
                  url: state.url,
                  portalUrl: state.portalUrl,
                  identityManager: serializeAndEncrypt(idManager, console),
                  layers: []
                };
              } else {
                service.identityManager = serializeAndEncrypt(idManager, console);
                if (state.portalUrl) {
                  service.portalUrl = state.portalUrl;
                }
              }

              config.featureServices.push(service);

              await processor.putConfig(config);
              const sanitizedService = await sanitizeFeatureService(service, identityService, console);
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

              // the client only understands event names (layer.events), not the ids persisted
              // server-side (layer.eventIds) - convert back so previously saved selections survive a reload
              const allEvents = await eventRepo.findAll();
              const eventIdToNameMap = new Map<MageEventId, string>();
              allEvents.forEach(event => eventIdToNameMap.set(event.id, event.name));

              const sanitizeFeatureServices = await Promise.all(
                featureServices.map(async (service) => {
                  const sanitized = await sanitizeFeatureService(service, identityService, console);
                  return {
                    ...sanitized,
                    layers: sanitized.layers.map(layer => ({
                      ...layer,
                      events: (layer.eventIds || [])
                        .map(eventId => eventIdToNameMap.get(eventId))
                        .filter((name): name is string => name !== undefined)
                    }))
                  };
                })
              );

              res.json({ ...remaining, featureServices: sanitizeFeatureServices });
            })
            .put(async (req, res) => {
              console.info('Applying ArcGIS plugin config...');
              const config = await stateRepo.get();
              const { featureServices: updatedServices, ...updateConfig } = req.body;


              // the client only knows event names, not the numeric ids persisted server-side -
              // build a lookup to translate layer.events back to eventIds, and carry forward each
              // service's already-persisted identityManager (the client never sends it back)
              const allEvents = await eventRepo.findAll();
              const eventNameToIdMap = new Map<string, MageEventId>();
              allEvents.forEach(event => {
                eventNameToIdMap.set(event.name, event.id);
              });

              const featureServices = buildFeatureServicesForSave(updatedServices, config.featureServices, eventNameToIdMap);

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
              let resolvedPortalUrl = portalUrl;
              if (token) {
                identityManager = await ArcGISIdentityManager.fromToken({ token });
              } else if (username && password) {
                const serverRoot = url.split(/\/rest\/services/i)[0];
                const { owningSystemUrl } = await request(`${serverRoot}/rest/info`);
                if (owningSystemUrl || portalUrl) {
                  const signedIn = await signInWithPortalCandidates(username, password, portalUrl || `${owningSystemUrl}/sharing/rest`, console);
                  identityManager = signedIn.identityManager;
                  resolvedPortalUrl = signedIn.portalUrl;
                } else {
                  // stand-alone ArcGIS Server with no portal; sign in to the server's own token service
                  identityManager = new ArcGISIdentityManager({ username, password, server: serverRoot });
                  await identityManager.refreshCredentials();
                }
              } else {
                return res.sendStatus(400);
              }

              const service: FeatureServiceConfig = { url, portalUrl: resolvedPortalUrl, layers: [], identityManager: serializeAndEncrypt(identityManager, console) };
              const existingService = config.featureServices.find(service => service.url === url);
              if (!existingService) {
                config.featureServices.push(service);
              }

              await processor.patchConfig(config);
              const sanitized = await sanitizeFeatureService(service, identityService, console);
              return res.send(sanitized);
            } catch (err) {
              return res.status(400).send(describeAuthFailure('feature service', err));
            }
          });

          routes.post('/featureService/discover', async (req, res) => {
            const { portalUrl, token, username, password, identityManager: serializedIdentityManager, start, num, filter } = req.body;
            if (!portalUrl) {
              return res.status(400).send('portalUrl is required');
            }

            try {
              if (serializedIdentityManager) {
                const identityManager = ArcGISIdentityManager.deserialize(serializedIdentityManager);
                const mayLackEditPrivilege = await checkEditPrivilege(portalUrl, identityManager, console);
                const page = await discoverFeatureServices(identityManager, console, start, num, filter);
                return res.send({ identityManager: identityManager.serialize(), portalUrl, mayLackEditPrivilege, ...page });
              }

              if (token) {
                const result = await discoverWithPortalCandidates(
                  portalUrl,
                  (candidatePortalUrl) => ArcGISIdentityManager.fromToken({ token, portal: candidatePortalUrl }),
                  start, num, filter, console
                );
                return res.send({ identityManager: result.identityManager.serialize(), portalUrl: result.portalUrl, mayLackEditPrivilege: result.mayLackEditPrivilege, ...result.page });
              } else if (username && password) {
                const result = await discoverWithPortalCandidates(
                  portalUrl,
                  (candidatePortalUrl) => ArcGISIdentityManager.signIn({ username, password, portal: candidatePortalUrl }),
                  start, num, filter, console
                );
                return res.send({ identityManager: result.identityManager.serialize(), portalUrl: result.portalUrl, mayLackEditPrivilege: result.mayLackEditPrivilege, ...result.page });
              } else {
                return res.sendStatus(400);
              }
            } catch (err) {
              return res.status(400).send(describeAuthFailure('portal', err));
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
              const sanitized = await commitFeatureService(processor.patchConfig.bind(processor), identityService, config, url, portalUrl, identityManager, console);
              return res.send(sanitized);
            } catch (err) {
              return res.status(400).send(describeAuthFailure('feature service', err));
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

          routes.get('/pushStatus', async (req, res) => {
            const eventId = Number(req.query.eventId);
            if (!Number.isFinite(eventId)) {
              return res.status(400).send('eventId query param is required');
            }
            const pageIndex = Math.max(0, Number(req.query.pageIndex) || 0);
            const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 25));

            try {
              const page = await processor.getPushedObservations(eventId, { pageIndex, pageSize });
              res.send(page);
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error(`Could not get pushed observations for event ${eventId}: ${message}`);
              res.status(500).json({ message: 'Could not get pushed observations', error: message });
            }
          });

          return routes;
        }
      }
    };
  }
};

export = arcgisPluginHooks