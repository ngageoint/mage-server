import { ArcGISPluginConfig } from "./ArcGISPluginConfig";
import { LayerInfo } from "./LayerInfo";
import { QueryObjectResult } from "./QueryObjectResult";
import { ArcGISIdentityManager } from "@esri/arcgis-rest-request";
import { queryFeatures } from '@esri/arcgis-rest-feature-service';

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
        const where = !this._config.eventIdField 
            ? `${this._config.observationIdField} LIKE '${observationId}${this._config.idSeparator}%'`
            : `${this._config.observationIdField} = '${observationId}'`;
        this._console.info('ArcGIS query observation: ' + this._url.toString() + where);
        await queryFeatures({
            url: this._url.toString(),
            authentication: this._identityManager,
            where,
            returnGeometry: geometry,
            outFields: fields?.length ? fields : '*'
        }).then((queryResponse) => response(queryResponse as QueryObjectResult)).catch((error) => this._console.error('Error in FeatureQuerier.queryObservation :: ' + error));
    }

    /**
     * Queries all observations.
     * @param response Function called once query is complete.
     * @param fields fields to query, all fields if not provided
     * @param geometry query the geometry, default is true
     */
    async queryObservations(response: (result: QueryObjectResult) => void, fields?: string[], geometry?: boolean) {
        this._console.info('ArcGIS query observation: ' + this._url.toString());
        await queryFeatures({
            url: this._url.toString(),
            authentication: this._identityManager,
            where: `${this._config.observationIdField} IS NOT NULL`,
            returnGeometry: geometry,
            outFields: fields?.length ? fields : '*'
        }).then((queryResponse) => response(queryResponse as QueryObjectResult)).catch((error) => this._console.error('Error in FeatureQuerier.queryObservations :: ' + error));
    }

    /**
     * Queries for distinct non null observation field values
     * @param response Function called once query is complete.
     * @param field field to query
     */
    async queryDistinct(response: (result: QueryObjectResult) => void, field: string) {
        this._console.info('ArcGIS query observation: ' + this._url.toString());
        await queryFeatures({
            url: this._url.toString(),
            authentication: this._identityManager,
            where: `${field} IS NOT NULL`,
            returnGeometry: false,
            outFields: field ? [field] : '*',
            returnDistinctValues: true
        }).then((queryResponse) => response(queryResponse as QueryObjectResult)).catch((error) => this._console.error('Error in FeatureQuerier.queryDistinct :: ' + error));
    }
}