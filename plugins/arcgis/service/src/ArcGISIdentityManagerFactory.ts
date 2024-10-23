import { ArcGISIdentityManager } from "@esri/arcgis-rest-request"
import { ArcGISAuthConfig, AuthType, FeatureServiceConfig, OAuthAuthConfig, TokenAuthConfig, UsernamePasswordAuthConfig } from './ArcGISConfig'
import { HttpClient } from "./HttpClient";
import { ObservationProcessor } from "./ObservationProcessor";

interface ArcGISIdentityManagerFactory {
  create(portal: string, server: string, config: ArcGISAuthConfig, httpClient?: HttpClient, processor?: ObservationProcessor): Promise<ArcGISIdentityManager>
}

const OAuthIdentityManagerFactory: ArcGISIdentityManagerFactory = {
  async create(portal: string, server: string, auth: OAuthAuthConfig, httpClient: HttpClient, processor: ObservationProcessor): Promise<ArcGISIdentityManager> {
    console.debug('Client ID provided for authentication')
    const { clientId, authToken, authTokenExpires, refreshToken, refreshTokenExpires } = auth

    if (authToken && new Date(authTokenExpires || 0) > new Date()) {
      return ArcGISIdentityManager.fromToken({
        clientId: clientId,
        token: authToken,
        tokenExpires: new Date(authTokenExpires || 0),
        portal: portal,
        server: server
      })
    } else if (refreshToken && new Date(refreshTokenExpires || 0) > new Date()) {
      // TODO: find a way without using constructor nor httpClient
      const url = `${portal}/oauth2/token?client_id=${clientId}&refresh_token=${refreshToken}&grant_type=refresh_token`
      try {
        const response = await httpClient.sendGet(url)
        // Update authToken to new token 
        const config = await processor.safeGetConfig();
        let service = config.featureServices.find(service => service.url === portal)?.auth as OAuthAuthConfig;
        const date = new Date();
        date.setSeconds(date.getSeconds() + response.expires_in || 0);
        service = {
          ...service,
          authToken: response.access_token,
          authTokenExpires: date.getTime()
        }

        await processor.putConfig(config)
        return ArcGISIdentityManager.fromToken({
          clientId: clientId,
          token: response.access_token,
          tokenExpires: date,
          portal: portal
        });
      } catch (error) {
        throw new Error('Error occurred when using refresh token')
      }

    } else {
      // TODO the config, we need to let the user know UI side they need to authenticate again
      throw new Error('Refresh token missing or expired')
    }
  }
}

const TokenIdentityManagerFactory: ArcGISIdentityManagerFactory = {
  async create(portal: string, server: string, auth: TokenAuthConfig): Promise<ArcGISIdentityManager> {
    console.debug('Token provided for authentication')
    const identityManager = await ArcGISIdentityManager.fromToken({
      token: auth.token,
      portal: portal,
      server: server,
      // TODO: what do we really want to do here? esri package seems to need this optional parameter. 
      // Use authTokenExpires if defined, otherwise set to now plus a day
      tokenExpires: auth.authTokenExpires ? new Date(auth.authTokenExpires) : new Date(Date.now() + 24 * 60 * 60 * 1000)
    })
    return identityManager
  }
}

const UsernamePasswordIdentityManagerFactory: ArcGISIdentityManagerFactory = {
  async create(portal: string, server: string, auth: UsernamePasswordAuthConfig): Promise<ArcGISIdentityManager> {
    console.debug('console and password provided for authentication, username:' + auth?.username)
    const identityManager = await ArcGISIdentityManager.signIn({ username: auth?.username, password: auth?.password, portal })
    return identityManager
  }
}

const authConfigMap: { [key: string]: ArcGISIdentityManagerFactory } = {
  [AuthType.OAuth]: OAuthIdentityManagerFactory,
  [AuthType.Token]: TokenIdentityManagerFactory,
  [AuthType.UsernamePassword]: UsernamePasswordIdentityManagerFactory
}

export function getIdentityManager(
  config: FeatureServiceConfig,
  httpClient: HttpClient, // TODO remove in favor of an open source lib like axios
  processor: ObservationProcessor
): Promise<ArcGISIdentityManager> {
  const auth = config.auth
  const authType = config.auth?.type
  if (!auth || !authType) {
    throw new Error('Auth type is undefined')
  }
  const factory = authConfigMap[authType]
  if (!factory) {
    throw new Error(`No factory found for type ${authType}`)
  }
  return factory.create(getPortalUrl(config.url), getServerUrl(config.url), auth, httpClient, processor)
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