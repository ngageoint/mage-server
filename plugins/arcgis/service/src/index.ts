import { InitPluginHook, PluginStateRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api'
import { GetAppRequestContext, WebRoutesHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.web'
import { ObservationRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.observations'
import { MageEventRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.events'
import { UserRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.users'
import { SettingPermission } from '@ngageoint/mage.service/lib/entities/authorization/entities.permissions'
import { ArcGISPluginConfig } from './ArcGISPluginConfig'
import { AuthType } from './ArcGISConfig'
import { ObservationProcessor } from './ObservationProcessor'
import { ArcGISIdentityManager, request } from "@esri/arcgis-rest-request"
import { FeatureServiceConfig, OAuthAuthConfig } from './ArcGISConfig'
import { URL } from "node:url"
import express from 'express'
import { getIdentityManager, getPortalUrl } from './ArcGISIdentityManagerFactory'

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

const sanitizeFeatureService = (config: FeatureServiceConfig, type: AuthType): FeatureServiceConfig => {
  if (type === AuthType.OAuth) {
      const newAuth = Object.assign({}, config.auth) as OAuthAuthConfig;
      delete newAuth.refreshToken;
      delete newAuth.refreshTokenExpires;
      return {
          ...config,
          auth: newAuth
      }
  }
  return config;
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
    // TODO
    // - Update layer token to get token from identity manager
    // - Move plugins/arcgis/web-app/projects/main/src/lib/arc-layer/arc-layer.component.ts addLayer to helper file and use instead of encodeURIComponent

    const processor = new ObservationProcessor(stateRepo, eventRepo, obsRepoForEvent, userRepo, console)
    processor.start()
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
            // TODO is clientId here in req or response
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
                service = { url: state.url, layers: [] }
                config.featureServices.push(service)
              }

              service.auth = {
                ...service.auth,
                type: AuthType.OAuth,
                clientId: state.clientId,
                authToken: idManager.token,
                authTokenExpires: idManager.tokenExpires.getTime(),
                refreshToken: idManager.refreshToken,
                refreshTokenExpires: idManager.refreshTokenExpires.getTime()
              }

              await processor.putConfig(config)
              // TODO: This seems like a bad idea to send the access tokens to the front end. It has no use for them and could potentially be a security concern
              res.send(`
                <html>
                  <head>
                    <script>
                      window.opener.postMessage(${JSON.stringify(service)}, '${req.protocol}://${req.headers.host}');
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
              config.featureServices = config.featureServices.map((service) => sanitizeFeatureService(service, AuthType.OAuth));
              res.json(config)
            })
            .put(async (req, res, next) => {
              console.info('Applying ArcGIS plugin config...')
              const arcConfig = req.body as ArcGISPluginConfig
              const configString = JSON.stringify(arcConfig)
              processor.patchConfig(arcConfig)
              res.sendStatus(200)
            })

          routes.post('/featureService/validate', async (req, res) => {
            const config = await processor.safeGetConfig()
            const { url, auth = {} } = req.body
            const { token, username, password } = auth
            if (!URL.canParse(url)) {
              return res.send('Invalid feature service url').status(400)
            }

            let service: FeatureServiceConfig
            if (token) {
              service = { url, layers: [], auth: { type: AuthType.Token, token } }
            } else if (username && password) {
              service = { url, layers: [], auth: { type: AuthType.UsernamePassword, username, password } }
            } else {
              return res.sendStatus(400)
            }

            try {
              // Create the IdentityManager instance to validate credentials
              await getIdentityManager(service)
              let existingService = config.featureServices.find(service => service.url === url)
              if (existingService) {
                existingService = { ...existingService }
              } else {
                config.featureServices.push(service)
              }
              await processor.patchConfig(config)
              return res.send(sanitizeFeatureService(service, AuthType.OAuth))
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
              const identityManager = await getIdentityManager(featureService)
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