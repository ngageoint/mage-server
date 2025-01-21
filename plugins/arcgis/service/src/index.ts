import { InitPluginHook, PluginStateRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api'
import { GetAppRequestContext, WebRoutesHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.web'
import { ObservationRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.observations'
import { MageEventRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.events'
import { UserRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.users'
import { SettingPermission } from '@ngageoint/mage.service/lib/entities/authorization/entities.permissions'
import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { ObservationProcessor } from './ObservationProcessor'
import { ArcGISIdentityManager, request } from "@esri/arcgis-rest-request"
import { FeatureServiceConfig, FeatureLayerConfig } from './ArcGISConfig'
import { URL } from "node:url"
import express from 'express'
import { ArcGISIdentityService, createArcGISIdentityService, getPortalUrl } from './ArcGISService'

const logPrefix = '[mage.arcgis]'
const logMethods = ['log', 'debug', 'info', 'warn', 'error'] as const
const consoleOverrides = logMethods.reduce((overrides, fn) => {
  return {
    ...overrides,
    [fn]: {
      writable: false,
      value: (...args: any[]) => {
        globalThis.console[fn](new Date().toISOString(), '-', logPrefix, ...args)
      }
    }
  } as PropertyDescriptorMap
}, {} as PropertyDescriptorMap)
const console = Object.create(globalThis.console, consoleOverrides) as Console

const InjectedServices = {
  stateRepo: PluginStateRepositoryToken,
  eventRepo: MageEventRepositoryToken,
  obsRepoForEvent: ObservationRepositoryToken,
  userRepo: UserRepositoryToken
}

const pluginWebRoute = "plugins/@ngageoint/mage.arcgis.service"

const sanitizeFeatureService = async (config: FeatureServiceConfig, identityService: ArcGISIdentityService): Promise<Omit<FeatureServiceConfig & { authenticated: boolean }, 'identityManager'>> => {
  let authenticated = false
  try {
    await identityService.signin(config)
    authenticated = true
  } catch (ignore) { }

  const { identityManager, ...sanitized } = config;
  return { ...sanitized, authenticated }
}

/**
 * The MAGE ArcGIS Plugin finds new MAGE observations and if configured to send the observations
 * to an ArcGIS server, it will then transform the observation to an ArcGIS feature and
 * send them to the configured ArcGIS feature layer.
 */
const arcgisPluginHooks: InitPluginHook<typeof InjectedServices> = {
  inject: {
    stateRepo: PluginStateRepositoryToken,
    eventRepo: MageEventRepositoryToken,
    obsRepoForEvent: ObservationRepositoryToken,
    userRepo: UserRepositoryToken
  },
  init: async (services): Promise<WebRoutesHooks> => {
    console.info('Intializing ArcGIS plugin...')
    const { stateRepo, eventRepo, obsRepoForEvent, userRepo } = services

    const identityService = createArcGISIdentityService(stateRepo)
    const processor = new ObservationProcessor(stateRepo, eventRepo, obsRepoForEvent, userRepo, identityService, console)
    await processor.start()
    return {
      webRoutes: {
        public: (requestContext: GetAppRequestContext) => {
          const routes = express.Router().use(express.json())

          routes.get('/oauth/signin', async (req, res) => {
            const url = req.query.featureServiceUrl as string
            if (!URL.canParse(url)) {
              return res.status(404).send('invalid feature service url')
            }

            const clientId = req.query.clientId as string
            if (!clientId) {
              return res.status(404).send('clientId is required')
            }

            const config = await processor.safeGetConfig()
            ArcGISIdentityManager.authorize({
              clientId,
              portal: getPortalUrl(url),
              redirectUri: `${config.baseUrl}/${pluginWebRoute}/oauth/authenticate`,
              state: JSON.stringify({ url: url, clientId: clientId })
            }, res)
          })

          routes.get('/oauth/authenticate', async (req, res) => {
            const code = req.query.code as string
            let state: { url: string, clientId: string }
            try {
              const { url, clientId } = JSON.parse(req.query.state as string)
              state = { url, clientId }
            } catch (err) {
              console.error('error parsing relay state', err)
              return res.sendStatus(500)
            }

            const config = await processor.safeGetConfig()
            const creds = {
              clientId: state.clientId,
              redirectUri: `${config.baseUrl}/${pluginWebRoute}/oauth/authenticate`,
              portal: getPortalUrl(state.url)
            }
            ArcGISIdentityManager.exchangeAuthorizationCode(creds, code).then(async (idManager: ArcGISIdentityManager) => {
              let service = config.featureServices.find(service => service.url === state.url)
              if (!service) {
                service = {
                  url: state.url,
                  identityManager: idManager.serialize(),
                  layers: []
                }
              } else {
                service.identityManager = idManager.serialize()
              }

              config.featureServices.push(service)

              await processor.putConfig(config)
              const sanitizedService = await sanitizeFeatureService(service, identityService)
              res.send(`
                <html>
                  <head>
                    <script>
                      window.opener.postMessage(${JSON.stringify(sanitizedService)}, '${req.protocol}://${req.headers.host}');
                    </script>
                  </head>
                </html>
              `);
            }).catch((error) => res.status(400).json(error))
          })

          return routes
        },
        protected: (requestContext: GetAppRequestContext) => {
          const routes = express.Router()
            .use(express.json())
            .use(async (req, res, next) => {
              const context = requestContext(req)
              const user = context.requestingPrincipal()
              if (!user.role.permissions.find(x => x === SettingPermission.UPDATE_SETTINGS)) {
                return res.status(403).json({ message: 'unauthorized' })
              }
              next()
            })

          routes.route('/config')
            .get(async (req, res, next) => {
              console.info('Getting ArcGIS plugin config...')
              const config = await processor.safeGetConfig()
              const { featureServices, ...remaining } = config

              const sanitizeFeatureServices = await Promise.all(
                featureServices.map(async (service) => await sanitizeFeatureService(service, identityService))
              )

              res.json({ ...remaining, featureServices: sanitizeFeatureServices })
            })
            .put(async (req, res, next) => {
              console.info('Applying ArcGIS plugin config...')
              const config = await stateRepo.get()
              const { featureServices: updatedServices, ...updateConfig } = req.body


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
                    layer: layer.layer,
                    geometryType: layer.geometryType,
                    eventIds: eventIds,
                  };

                  return featureLayerConfig;
                });

                return {
                  url: updateService.url,
                  layers: layers,
                  // Map exisiting identityManager, client does not send this
                  identityManager: existingService?.identityManager || '',
                };
              });

              await stateRepo.patch({ ...updateConfig, featureServices })

              // Sync configuration with feature servers by restarting observation processor
              processor.stop()
              await processor.start()

              res.sendStatus(200)
            })

          routes.post('/featureService/validate', async (req, res) => {
            const config = await processor.safeGetConfig()
            const { url, token, username, password } = req.body
            if (!URL.canParse(url)) {
              return res.send('Invalid feature service url').status(400)
            }

            let service: FeatureServiceConfig
            let identityManager: ArcGISIdentityManager
            if (token) {
              identityManager = await ArcGISIdentityManager.fromToken({ token })
              service = { url, layers: [], identityManager: identityManager.serialize() }
            } else if (username && password) {
              identityManager = await ArcGISIdentityManager.signIn({
                username,
                password,
                portal: getPortalUrl(url)
              })
              service = { url, layers: [], identityManager: identityManager.serialize() }
            } else {
              return res.sendStatus(400)
            }

            try {
              const existingService = config.featureServices.find(service => service.url === url)
              if (!existingService) {
                config.featureServices.push(service)
              }

              await processor.patchConfig(config)
              const sanitized = await sanitizeFeatureService(service, identityService)
              return res.send(sanitized)
            } catch (err) {
              return res.send('Invalid credentials provided to communicate with feature service').status(400)
            }
          })

          routes.get('/featureService/layers', async (req, res, next) => {
            const url = req.query.featureServiceUrl as string
            const config = await processor.safeGetConfig()
            const featureService = config.featureServices.find(featureService => featureService.url === url)
            if (!featureService) {
              return res.status(400)
            }

            try {
              const identityManager = await identityService.signin(featureService)
              const response = await request(url, {
                authentication: identityManager
              })
              res.send(response.layers)
            } catch (err) {
              console.error(err)
              res.status(500).json({ message: 'Could not get ArcGIS layer info', error: err })
            }
          })

          return routes
        }
      }
    }
  }
}

export = arcgisPluginHooks