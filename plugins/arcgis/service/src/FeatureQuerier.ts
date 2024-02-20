import { ArcGISPluginConfig } from "./ArcGISPluginConfig";
import { HttpClient } from "./HttpClient";
import { LayerInfo } from "./LayerInfo";
import { QueryObjectResult } from "./QueryObjectResult";

/**
 * Performs various queries on observations for a specific arc feature layer.
 */
export class FeatureQuerier {

    /**
     * Used to query the arc server to figure out if an observation exists.
     */
    private _httpClient: HttpClient;

    /**
     * The query url to find out if an observations exists on the server.
     */
    private _url: string;

    /**
     * Used to log to console.
     */
    private _console: Console;

    /**
     * The configuration for this plugin.
     */
    private _config: ArcGISPluginConfig;

    /**
     * Constructor.
     * @param layerInfo The layer info.
     * @param config The plugins configuration.
     * @param console Used to log to the console.
     */
    constructor(layerInfo: LayerInfo, config: ArcGISPluginConfig, console: Console) {
        this._httpClient = new HttpClient(console, layerInfo.token);
        this._url = layerInfo.url + '/query?where=';
        this._console = console;
        this._config = config;
    }

    /**
     * Queries for an observation by id.
     * @param observationId The id of the observation to query for on the arc feature layer.
     * @param response The function called once the response is received.
     * @param fields fields to query, all fields if not provided
     * @param geometry query the geometry, default is true
     */
    queryObservation(observationId: string, response: (result: QueryObjectResult) => void, fields?: string[], geometry?: boolean) {
        let queryUrl = this._url + this._config.observationIdField
        if (this._config.eventIdField == null) {
            queryUrl += ' LIKE \'' + observationId + this._config.idSeparator + '%\''
        } else {
            queryUrl += '=\'' + observationId + '\''
        }
        queryUrl += this.outFields(fields) + this.returnGeometry(geometry)
        this._httpClient.sendGetHandleResponse(queryUrl, (chunk) => {
            this._console.info('ArcGIS response for ' + queryUrl + ' ' + chunk)
            const result = JSON.parse(chunk) as QueryObjectResult
            response(result)
        });
    }

    /**
     * Queries all observations.
     * @param response Function called once query is complete.
     * @param fields fields to query, all fields if not provided
     * @param geometry query the geometry, default is true
     */
    queryObservations(response: (result: QueryObjectResult) => void, fields?: string[], geometry?: boolean) {
        let queryUrl = this._url + this._config.observationIdField + ' IS NOT NULL' + this.outFields(fields) + this.returnGeometry(geometry)
        this._httpClient.sendGetHandleResponse(queryUrl, (chunk) => {
            this._console.info('ArcGIS response for ' + queryUrl + ' ' + chunk)
            const result = JSON.parse(chunk) as QueryObjectResult
            response(result)
        });
    }

    /**
     * Queries for distinct non null observation field values
     * @param response Function called once query is complete.
     * @param field field to query
     */
    queryDistinct(response: (result: QueryObjectResult) => void, field: string) {
        let queryUrl = this._url + field + ' IS NOT NULL&returnDistinctValues=true' + this.outFields([field]) + this.returnGeometry(false)
        this._httpClient.sendGetHandleResponse(queryUrl, (chunk) => {
            this._console.info('ArcGIS response for ' + queryUrl + ' ' + chunk)
            const result = JSON.parse(chunk) as QueryObjectResult
            response(result)
        });
    }

    /**
     * Build the out fields query parameter
     * @param fields query fields
     * @returns out fields
     */
    private outFields(fields?: string[]): string {
        let outFields = '&outFields='
        if (fields != null && fields.length > 0) {
            for (let i = 0; i < fields.length; i++) {
                if (i > 0) {
                    outFields += ","
                }
                outFields += fields[i]
            }
        } else{
            outFields += '*'
        }
        return outFields
    }

    /**
     * Build the return geometry query parameter
     * @param fields query fields
     * @returns out fields
     */
    private returnGeometry(geometry?: boolean): string {
        let returnGeometry = ''
        if (geometry != null && !geometry) {
            returnGeometry = '&returnGeometry=false'
        }
        return returnGeometry
    }

}