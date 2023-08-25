import { LayerInfoResult} from "./LayerInfoResult";
import { FeatureServiceResult} from "./FeatureServiceResult";
import { HttpClient } from "./HttpClient";
import { FeatureServiceConfig, FeatureLayerConfig } from "./ArcGISConfig";

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
            } catch(e) {
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
            } catch(e) {
                this._console.error(e)
            }
        }
    }

}