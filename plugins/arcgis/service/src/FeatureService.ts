import { LayerInfoResult } from "./LayerInfoResult";
import { FeatureServiceResult } from "./FeatureServiceResult";
import { HttpClient } from "./HttpClient";
import { AuthType, FeatureServiceConfig } from "./ArcGISConfig";
import { ArcGISIdentityManager } from "@esri/arcgis-rest-request";
import { URL } from "node:url"

/**
 * Queries arc feature services and layers.
 */
export class FeatureService {

	/**
	 * Used to make the get request about the feature layer.
	 */
	private _httpClient: HttpClient;

	/**
	 * Used to log messages.
	 */
	private _console: Console;

	/**
	 * Constructor.
	 * @param console Used to log messages. 
	 * @param token The access token.
	 */
	constructor(console: Console, token?: string) {
		this._httpClient = new HttpClient(console, token);
		this._console = console;
	}

	/**
	 * Queries an arc feature service.
	 * @param url The url to the arc feature layer.
	 * @param callback Function to call once response has been received and parsed.
	 */
	queryFeatureService(url: string, callback: (featureService: FeatureServiceResult) => void) {
		this._httpClient.sendGetHandleResponse(url, this.parseFeatureService(url, callback))
	}

	/**
	 * Parses the response from the feature service request and sends to the callback.
	 * @param url The url to the arc feature layer.
	 * @param callback The callback to call and send the feature service to.
	 */
	private parseFeatureService(url: string, callback: (featureService: FeatureServiceResult) => void) {
		return (chunk: any) => {
			this._console.log('Feature Service. url: ' + url + ', response: ' + chunk)
			try {
				const service = JSON.parse(chunk) as FeatureServiceResult
				callback(service)
			} catch (e) {
				this._console.error(e)
			}
		}
	}

	/**
	 * Queries an arc feature layer to get info on the layer.
	 * @param url The url to the arc feature layer.
	 * @param infoCallback Function to call once response has been received and parsed.
	 */
	queryLayerInfo(url: string, infoCallback: (layerInfo: LayerInfoResult) => void) {
		this._httpClient.sendGetHandleResponse(url, this.parseLayerInfo(url, infoCallback));
	}

	/**
	 * Parses the response from the request and sends the layer info to the callback.
	 * @param url The url to the feature layer.
	 * @param infoCallback The callback to call and send the layer info to.
	 */
	private parseLayerInfo(url: string, infoCallback: (layerInfo: LayerInfoResult) => void) {
		return (chunk: any) => {
			this._console.log('Query Layer. url: ' + url + ', response: ' + chunk)
			try {
				const layerInfo = JSON.parse(chunk) as LayerInfoResult
				infoCallback(layerInfo)
			} catch (e) {
				this._console.error(e)
			}
		}
	}
}

export function getPortalUrl(featureService: FeatureServiceConfig | string): string {
	const url = getFeatureServiceUrl(featureService)
	return `https://${new URL(url).hostname}/arcgis/sharing/rest`
}

export function getServerUrl(featureService: FeatureServiceConfig | string): string {
	const url = getFeatureServiceUrl(featureService)
	return `https://${url.hostname}/arcgis`
}

export function getFeatureServiceUrl(featureService: FeatureServiceConfig | string): URL {
	const url = typeof featureService === 'string' ? featureService : featureService.url
	return new URL(url)
}

export async function getIdentityManager(
	featureService: FeatureServiceConfig,
	httpClient: HttpClient // TODO remove in favor of an open source lib like axios
): Promise<ArcGISIdentityManager> {
	switch (featureService.auth?.type) {
		case AuthType.Token: {
			return ArcGISIdentityManager.fromToken({
				token: featureService.auth?.token,
				portal: getPortalUrl(featureService),
				server: getServerUrl(featureService)
			})
		}
		case AuthType.UsernamePassword: {
			return ArcGISIdentityManager.signIn({
				username: featureService.auth?.username,
				password: featureService.auth?.password,
				portal: getPortalUrl(featureService),
			})
		}
		case AuthType.OAuth: {
			// Check if feature service has refresh token and use that to generate token to use
			const portal = getPortalUrl(featureService)
			const { clientId, authToken, authTokenExpires, refreshToken, refreshTokenExpires } = featureService.auth
			if (authToken && new Date(authTokenExpires || 0) > new Date()) {
				return new ArcGISIdentityManager({
					clientId: clientId,
					token: authToken,
					tokenExpires: new Date(authTokenExpires || 0),
					refreshToken: refreshToken,
					refreshTokenExpires: new Date(refreshTokenExpires || 0),
					portal: getPortalUrl(featureService),
					server: getServerUrl(featureService)
				})
			} else {
				if (refreshToken && new Date(refreshTokenExpires || 0) > new Date()) {
					const url = `${portal}/oauth2/token?client_id=${clientId}&refresh_token=${refreshToken}&grant_type=refresh_token`
					const response = await httpClient.sendGet(url)
					// TODO: error handling
					return ArcGISIdentityManager.fromToken({
						clientId: clientId,
						token: response.access_token,
						portal: portal
					});
					// TODO: update authToken to new token
				} else {
					// TODO the config, we need to let the user know UI side they need to authenticate again
					throw new Error('Refresh token missing or expired')
				}
			}
		}
		default: throw new Error('Authentication type not supported')
	}
}