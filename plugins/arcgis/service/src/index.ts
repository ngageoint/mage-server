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

// TODO: Remove hard coded creds
const credentials = {
  clientId: 'kbHGOg5BFjYf1sTA',
  portal: 'https://arcgis.geointnext.com/arcgis/sharing/rest',
  redirectUri: 'http://localhost:4242/plugins/@ngageoint/mage.arcgis.service/oauth/authenticate'
}

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
async function handleAuthentication(req: express.Request, httpClient: HttpClient, processor: ObservationProcessor): Promise<ArcGISIdentityManager> {
  const featureUsername = req.query.username as string | undefined;
  const featurePassword = req.query.password as string | undefined;
  const featureClientId = req.query.clientId as string | undefined;
  const featureServer = req.query.server as string | undefined;
  const featurePortal = req.query.portal as string | undefined;
  const featureToken = req.query.token as string | undefined;
  const portalUrl = getPortalUrl(req.query.featureUrl as string ?? '');

  let identityManager: ArcGISIdentityManager;

  try {
    if (featureToken) {
      console.log('Token provided for authentication');
      identityManager = await ArcGISIdentityManager.fromToken({
        token: featureToken,
        server: getServerUrl(req.query.featureUrl as string ?? ''),
        portal: portalUrl
      });
    } else if (featureUsername && featurePassword) {
      console.log('Username and password provided for authentication, username:' + featureUsername);
      identityManager = await ArcGISIdentityManager.signIn({
        username: featureUsername,
        password: featurePassword,
        portal: portalUrl,
      });
    } else if (featureClientId) {
      console.log('Client ID provided for authentication');

      // Check if feature service has refresh token and use that to generate token to use
      // Else complain
      const config = await processor.safeGetConfig();
      const featureService = config.featureServices.find((service) => service.auth?.clientId === featureClientId);
      const authToken = featureService?.auth?.authToken;
      const authTokenExpires = featureService?.auth?.authTokenExpires as string;
      if (authToken && new Date(authTokenExpires) > new Date()) {
        // TODO: error handling
        identityManager = await ArcGISIdentityManager.fromToken({
          clientId: featureClientId,
          token: authToken,
          portal: portalUrl
        });
      } else {
        const refreshToken = featureService?.auth?.refreshToken;
        const refreshTokenExpires = featureService?.auth?.refreshTokenExpires as string;
        if (refreshToken && new Date(refreshTokenExpires) > new Date()) {
          const url = `${portalUrl}/oauth2/token?client_id=${featureClientId}&refresh_token=${refreshToken}&grant_type=refresh_token`
          const response = await httpClient.sendGet(url)
          // TODO: error handling
          identityManager = await ArcGISIdentityManager.fromToken({
            clientId: featureClientId,
            token: response.access_token,
            portal: portalUrl
          });
          // TODO: update authToken to new token
        } else {
          throw new Error('Refresh token missing or expired.')
        }
      }
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
          routes.get("/oauth/sign-in", async (req, res) => {
            const clientId = req.query.clientId as string;
            const portal = req.query.portalUrl as string;
            const redirectUri = req.query.redirectUrl as string;
            // TODO: Replace with better way if possible to pass creds to /oauth/authenticate
            const config = await processor.safeGetConfig();
            config.featureServices.push({
              url: portal,
              layers: [],
              auth: {
                clientId: clientId,
                redirectUri: redirectUri
              }
            })
            await processor.putConfig(config);
            ArcGISIdentityManager.authorize({
              clientId,
              portal,
              redirectUri
            }, res);
          })
          routes.get('/oauth/authenticate', async (req, res) => {
            const code = req.query.code as string;
            // TODO: Use req or session data to find correct feature service instead of hard coding
            // TODO: error handling
            const config = await processor.safeGetConfig();
            const featureService = config.featureServices[0];
            const creds = {
              clientId: featureService.auth?.clientId as string,
              redirectUri: featureService.auth?.redirectUri as string,
              portal: featureService.url as string
            }
            ArcGISIdentityManager.exchangeAuthorizationCode(creds, code)
              .then(async (idManager: ArcGISIdentityManager) => {
                featureService.auth = {
                  ...featureService.auth,
                  authToken: idManager.token,
                  authTokenExpires: idManager.tokenExpires.toISOString(),
                  refreshToken: idManager.refreshToken,
                  refreshTokenExpires: idManager.refreshTokenExpires.toISOString()
                }
                await processor.putConfig(config);
                res.status(200).json({})
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
                identityManager = await handleAuthentication(req, httpClient, processor);

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