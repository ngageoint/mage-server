import { InitPluginHook, PluginStateRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api'
import { GetAppRequestContext, WebRoutesHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.web'
import { ObservationRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.observations'
import { MageEventRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.events'
import { UserRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.users'
import { SettingPermission } from '@ngageoint/mage.service/lib/entities/authorization/entities.permissions'
import express from 'express'
import { ArcGISPluginConfig } from './ArcGISPluginConfig'
import { ObservationProcessor } from './ObservationProcessor'
import { HttpClient } from './HttpClient'
import { FeatureServiceResult } from './FeatureServiceResult'
import { ArcGISIdentityManager } from "@esri/arcgis-rest-request"
// import { IQueryFeaturesOptions, queryFeatures } from '@esri/arcgis-rest-feature-service'

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

/**
 * Provides the portal URL from a given feature URL.
 *
 * @param {string} featureServiceUrl - The URL of the feature service.
 * @returns {string} The portal URL.
 */
function getPortalUrl(featureServiceUrl: string): string {
  const url = new URL(featureServiceUrl);
  return `https://${url.hostname}/arcgis/sharing/rest`;
}

/**
 * Provides the server URL from a given feature URL.
 *
 * @param {string} featureServiceUrl - The URL of the feature service.
 * @returns {string} The server URL.
 */
function getServerUrl(featureServiceUrl: string): string {
  const url = new URL(featureServiceUrl);
  return `https://${url.hostname}/arcgis`;
}

  /**
   * Handles authentication for a given request.
   *
   * @param {express.Request} req The express request object.
   * @returns {Promise<ArcGISIdentityManager>} The authenticated identity manager.
   *
   * @throws {Error} If the identity manager could not be created due to missing required query parameters.
   */
async function handleAuthentication(req: express.Request, httpClient: HttpClient): Promise<ArcGISIdentityManager> {
  const featureUsername = req.query.username as string | undefined;
  const featurePassword = req.query.password as string | undefined;
  const featureClientId = req.query.clientId as string | undefined;
  const featureClientSecret = req.query.clientSecret as string | undefined;
  const featureServer = req.query.server as string | undefined;
  const featurePortal = req.query.portal as string | undefined;
  const featureToken = req.query.token as string | undefined;
  const portalUrl = getPortalUrl(req.query.featureUrl as string ?? '');

  let identityManager: ArcGISIdentityManager;

  try {
    if (featureToken) {
      console.log('Token provided for authentication');
      identityManager = await ArcGISIdentityManager.fromToken({ token: featureToken, server: getServerUrl(req.query.featureUrl as string ?? ''), portal: portalUrl });
    } else if (featureUsername && featurePassword) {
      console.log('Username and password provided for authentication, username:' + featureUsername);
      identityManager = await ArcGISIdentityManager.signIn({
        username: featureUsername,
        password: featurePassword,
        portal: portalUrl,
      });
    } else if (featureClientId && featureClientSecret) {
      console.log('ClientId and Client secret provided for authentication');
      const params = {
        client_id: featureClientId,
        client_secret: featureClientSecret,
        grant_type: 'client_credentials',
        expiration: 900
      }

      const url = `${portalUrl}/oauth2/token?client_id=${params.client_id}&client_secret=${oauthCreds.clientSecret}&grant_type=${params.grant_type}&expiration=${params.expiration}`
      const response = await httpClient.sendGet(url);
      identityManager = await ArcGISIdentityManager.fromToken({
        clientId: featureClientId,
        token: JSON.parse(response)?.access_token || '',
        portal: portalUrl
      });
    } else {
      throw new Error('Missing required query parameters to authenticate (token or username/password).');
    }

    console.log('Identity Manager token', identityManager.token);
    console.log('Identity Manager token expires', identityManager.tokenExpires); //TODO - is expiration arbitrary from ArcGISIdentityManager or actually the correct expiration allowed by server? Why undefined days later?
  } catch (error) {
    console.error('Error during authentication:', error);
    throw new Error('Authentication failed.');
  }
  return identityManager;
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
    // - Move getServerUrl to Helper file
    // - Move getPortalUrl to Helper file
    // - Update layer token to get token from identity manager
    // - Move plugins/arcgis/web-app/projects/main/src/lib/arc-layer/arc-layer.component.ts addLayer to helper file and use instead of encodeURIComponent
    // - Remove Client secret from returned Config object if applicable

    const processor = new ObservationProcessor(stateRepo, eventRepo, obsRepoForEvent, userRepo, console);
    processor.start();
    return {
      webRoutes: {
        public: (requestContext: GetAppRequestContext) => {
          const routes = express.Router().use(express.json());
          // TODO: Add User initiated Oauth
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
              const config = await processor.safeGetConfig();
              res.json(config)
            })
            .put(async (req, res, next) => {
              console.info('Applying ArcGIS plugin config...')
              const arcConfig = req.body as ArcGISPluginConfig
              const configString = JSON.stringify(arcConfig)
              console.info(configString)
              processor.putConfig(arcConfig)
              res.status(200).json({}) // TODO: Why returning 200 with an empty object here, should we update?
            })
          routes.route('/arcgisLayers')
            .get(async (req, res, next) => {
              const featureUrl = req.query.featureUrl as string;
              console.info('Getting ArcGIS layer info for ' + featureUrl)
              let identityManager: ArcGISIdentityManager;
              const httpClient = new HttpClient(console);

              try {
                identityManager = await handleAuthentication(req, httpClient);

                const featureUrlAndToken = featureUrl + '?token=' + encodeURIComponent(identityManager.token);
                console.log('featureUrlAndToken', featureUrlAndToken);
    
                httpClient.sendGetHandleResponse(featureUrlAndToken, (chunk) => {
                  console.info('ArcGIS layer info response ' + chunk);
                  try {
                    const featureServiceResult = JSON.parse(chunk) as FeatureServiceResult;
                    res.json(featureServiceResult);
                  } catch  (e) {
                    if (e instanceof SyntaxError) {
                      console.error('Problem with url response for url ' + featureUrl + ' error ' + e)
                      res.status(200).json({}) // TODO: Why returning 200 with an empty object here, should we update?
                    } else {
                      throw e;
                    }
                  }
                });
              } catch (err) {
                res.status(500).json({ message: 'Could not get ArcGIS layer info', error: err });
              }
          })

          return routes
        }
      }
    }
  }
}

export = arcgisPluginHooks