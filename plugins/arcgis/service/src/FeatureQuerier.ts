import { ArcGISPluginConfig } from "./types/ArcGISPluginConfig";
import { LayerInfo } from "./LayerInfo";
import { QueryObjectResult } from "./types/QueryObjectResult";
import { ArcGISIdentityManager, ArcGISRequestError } from "@esri/arcgis-rest-request";
import { queryFeatures, IQueryFeaturesOptions } from '@esri/arcgis-rest-feature-service';
import { MageEventId } from "@ngageoint/mage.service/lib/entities/events/entities.events";

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
     * Creates a new instance of FeatureQuerier.
     * @param {LayerInfo} layerInfo - Information about the ArcGIS feature layer.
     * @param {ArcGISPluginConfig} config - Configuration settings for the ArcGIS plugin.
     * @param {ArcGISIdentityManager} identityManager - ArcGIS identity manager for authentication.
     * @param {Console} console - Console instance for logging.
     */
    constructor(layerInfo: LayerInfo, config: ArcGISPluginConfig, identityManager: ArcGISIdentityManager, console: Console) {
        this._identityManager = identityManager;
        this._url = new URL(layerInfo.url);
        this._console = console;
        this._config = config;
    }

    /**
     * Queries for an observation by id.
     * @param {string} observationId - The id of the observation to query for on the arc feature layer.
     * @param {function(QueryObjectResult): void} handleResponse - Callback function called with the query result.
     * @param {string[]} [fields] - Optional array of field names to query. If not provided, all fields are queried.
     * @param {boolean} [geometry] - Optional flag to include geometry in the query. Defaults to true.
     */
    async queryObservation(observationId: string, handleResponse: (result: QueryObjectResult) => void, fields?: string[], geometry?: boolean) {
        const where = !this._config.eventIdField
            ? `${this._config.observationIdField} LIKE '${observationId}${this._config.idSeparator}%'`
            : `${this._config.observationIdField} = '${observationId}'`;
        this._console.info('ArcGIS query observation: ' + this._url.toString() + where);
        try {
            const response = await queryFeatures({
                url: this._url.toString(),
                authentication: this._identityManager,
                where,
                returnGeometry: geometry,
                outFields: fields?.length ? fields : '*'
            });
            handleResponse(response as QueryObjectResult);
        } catch (error) {
            this._console.error('Error in FeatureQuerier.queryObservation :: ' + error);
            if (error instanceof ArcGISRequestError) {
                this._console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error?.response?.error?.details || "<unknown>"}`);
            }
        }
    }

    /**
     * Queries all observations.
     * @param {function(QueryObjectResult): void} handleResponse - Callback function called with the query result.
     * @param {string[]} [fields] - Optional array of field names to query. If not provided, all fields are queried.
     * @param {boolean} [geometry] - Optional flag to include geometry in the query. Defaults to true.
     */
    async queryObservations(handleResponse: (result: QueryObjectResult) => void, fields?: string[], geometry?: boolean) {
        this._console.info('ArcGIS query observation: ' + this._url.toString());
        try {
            const response = await queryFeatures({
                url: this._url.toString(),
                authentication: this._identityManager,
                where: `${this._config.observationIdField} IS NOT NULL`,
                returnGeometry: geometry,
                outFields: fields?.length ? fields : '*'
            });
            handleResponse(response as QueryObjectResult);
        } catch (error) {
            this._console.error('Error in FeatureQuerier.queryObservations :: ' + error);
            if (error instanceof ArcGISRequestError) {
                this._console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error?.response?.error?.details || "<unknown>"}`);
            }
        }
    }

    /**
     * Queries for the MAGE observation ids of all features on this layer belonging to the given event.
     * @param {MageEventId} eventId - The MAGE event id to find synced observations for.
     * @param {function(string[]): void} handleResponse - Callback function called with the resolved MAGE observation ids.
     */
    async queryObservationsForEvent(eventId: MageEventId, handleResponse: (observationIds: string[]) => void) {
        const where = this._config.eventIdField
            ? `${this._config.eventIdField} = '${eventId}'`
            : `${this._config.observationIdField} LIKE '%${this._config.idSeparator}${eventId}'`;
        this._console.info(`ArcGIS query observations for event ${eventId}: ${this._url.toString()}`);
        try {
            const response = await queryFeatures({
                url: this._url.toString(),
                authentication: this._identityManager,
                where,
                returnGeometry: false,
                outFields: [this._config.observationIdField]
            }) as QueryObjectResult;
            const observationIds = response.features
                .map(feature => this.extractObservationId(feature.attributes[this._config.observationIdField] as string))
                .filter((id): id is string => !!id);
            handleResponse(observationIds);
        } catch (error) {
            this._console.error(`Error in FeatureQuerier.queryObservationsForEvent :: ` + error);
            if (error instanceof ArcGISRequestError) {
                this._console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error?.response?.error?.details || "<unknown>"}`);
            }
        }
    }

    // when eventIdField is configured, observationIdField holds the plain MAGE observation id; otherwise
    // the id and event id are concatenated (observationId + idSeparator + eventId), so recover just the id
    private extractObservationId(rawValue: string): string | undefined {
        if (!rawValue) {
            return undefined;
        }
        if (this._config.eventIdField) {
            return rawValue;
        }
        return rawValue.split(this._config.idSeparator)[0];
    }

    /**
     * Queries for distinct non-null values in a specified field.
     * @param {function(QueryObjectResult): void} handleResponse - Callback function called with the query result.
     * @param {string} field - The field name to query for distinct values.
     */
    async queryDistinct(handleResponse: (result: QueryObjectResult) => void, field: string) {
        this._console.info(`ArcGIS query distinct observations, field: ${field}, URL: ${this._url.toString()}`);
        try {
            const query = {
                url: this._url.toString(),
                authentication: this._identityManager,
                where: `${field} IS NOT NULL`,
                returnGeometry: false,
                outFields: field ? [field] : '*',
                returnDistinctValues: true
            } as IQueryFeaturesOptions;
            const response = await queryFeatures(query);
            handleResponse(response as QueryObjectResult);
        } catch (error) {
            this._console.error('Error in FeatureQuerier.queryDistinct :: ' + error);
            if (error instanceof ArcGISRequestError) {
                this._console.error(`  message: ${error.response?.error?.message || "<unknown>"}, details: ${error?.response?.error?.details || "<unknown>"}`);
            }
        }
    }
}