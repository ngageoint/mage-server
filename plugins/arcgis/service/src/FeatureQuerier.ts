import { ArcGISPluginConfig } from "./ArcGISPluginConfig";
import { LayerInfo } from "./LayerInfo";
import { QueryObjectResult } from "./QueryObjectResult";
import { ArcGISIdentityManager, request } from "@esri/arcgis-rest-request";

/**
 * Performs various queries on observations for a specific arc feature layer.
 */
export class FeatureQuerier {

    /**
     * The query url to find out if an observations exists on the server.
     */
    private _url: URL;

    /**
     * Used to log to console.
     */
    private _console: Console;

    /**
     * The configuration for this plugin.
     */
    private _config: ArcGISPluginConfig;

    /**
     * An instance of `ArcGISIdentityManager` used to manage authentication and identity for ArcGIS services.
     * This private member handles the authentication process, ensuring that requests to ArcGIS services
     * are properly authenticated using the credentials provided.
     */
    private _identityManager: ArcGISIdentityManager;

    /**
     * Constructor.
     * @param layerInfo The layer info.
     * @param config The plugins configuration.
     * @param console Used to log to the console.
     */
    constructor(layerInfo: LayerInfo, config: ArcGISPluginConfig, identityManager: ArcGISIdentityManager, console: Console) {
        this._identityManager = identityManager;
        this._url = new URL(layerInfo.url);
        this._url.pathname += '/query';
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
    async queryObservation(observationId: string, response: (result: QueryObjectResult) => void, fields?: string[], geometry?: boolean) {
        const queryUrl = new URL(this._url)
        if (this._config.eventIdField == null) {
            queryUrl.searchParams.set('where', `${this._config.observationIdField} LIKE '${observationId}${this._config.idSeparator}%'`);
        } else {
            queryUrl.searchParams.set('where', `${this._config.observationIdField} = ${observationId}`);
        }
        queryUrl.searchParams.set('outFields', this.outFields(fields))
        queryUrl.searchParams.set('returnGeometry', geometry === false ? 'false' : 'true')
        this._console.info('ArcGIS query: ' + queryUrl)

        const queryResponse = await request(queryUrl.toString(), {
            authentication: this._identityManager,
            params: { f: 'json' }
        });

        response(queryResponse as QueryObjectResult);
    }

    /**
     * Queries all observations.
     * @param response Function called once query is complete.
     * @param fields fields to query, all fields if not provided
     * @param geometry query the geometry, default is true
     */
    async queryObservations(response: (result: QueryObjectResult) => void, fields?: string[], geometry?: boolean) {
        const queryUrl = new URL(this._url)
        queryUrl.searchParams.set('where', `${this._config.observationIdField} IS NOT NULL`);
        queryUrl.searchParams.set('outFields', this.outFields(fields));
        queryUrl.searchParams.set('returnGeometry', geometry === false ? 'false' : 'true');
        
        this._console.info('ArcGIS query: ' + queryUrl)

        const queryResponse = await request(queryUrl.toString(), {
            authentication: this._identityManager,
            params: { f: 'json' }
        });

        response(queryResponse as QueryObjectResult);
    }

    /**
     * Queries for distinct non null observation field values
     * @param response Function called once query is complete.
     * @param field field to query
     */
    async queryDistinct(response: (result: QueryObjectResult) => void, field: string) {
        const queryUrl = new URL(this._url);
        queryUrl.searchParams.set('where', `${field} IS NOT NULL`);
        queryUrl.searchParams.set('returnDistinctValues', 'true');
        queryUrl.searchParams.set('outFields', this.outFields([field]));
        queryUrl.searchParams.set('returnGeometry', 'false');      
        this._console.info('ArcGIS query: ' + queryUrl)

        try {
            const queryResponse = await request(queryUrl.toString(), {
                authentication: this._identityManager,
                params: { f: 'json' }

            });  

            response(queryResponse as QueryObjectResult);
        } catch (err) {
            console.error("could not query", err)
        }
    }

    /**
     * Build the out fields query parameter
     * @param fields query fields
     * @returns out fields
     */
    private outFields(fields?: string[]): string {
        if (fields != null && fields.length > 0) {
            return fields.join(',');
        } else {
            return '*';
        }
    }

}