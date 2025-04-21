import { ArcGISIdentityManager } from "@esri/arcgis-rest-request"
import { getLayer, getService, queryFeatures, applyEdits } from "@esri/arcgis-rest-feature-service";
import { FeatureServiceConfig } from "./types/ArcGISConfig";

// TODO: Migrate FeatureQuerier to use this class

/**
 * Queries arc feature services and layers.
 */
export class FeatureService {

  private _console: Console;
  private _config: FeatureServiceConfig;
  private _identityManager: ArcGISIdentityManager;

  constructor(console: Console, config: FeatureServiceConfig, identityManager: ArcGISIdentityManager) {
    this._config = config;
    this._identityManager = identityManager;
    this._console = console;
  }

  /**
   * Gets features from the feature service using the given where clause.
   * @param {string} whereClause - The where clause to filter the features.
   * @returns {Promise<any>} - A promise that resolves to the query result.
   */
  async getFeatures(whereClause: string): Promise<any> {
    const queryParams = {
      url: this._config.url,
      where: whereClause,
      authentication: this._identityManager
    };

    this._console.info('Querying feature service with params: ', queryParams);

    return await queryFeatures(queryParams).catch((error) => {
      this._console.error('Error querying feature service:', error);
      throw new Error(`Error querying feature service: ${error}`);
    });
  }

  /**
   * Gets a specific layer from the feature service.
   * @param {string | number} layerId - The ID of the layer to query.
   * @returns {Promise<any>} - A promise that resolves to the layer info.
   */
  async getLayer(layerId: string | number): Promise<any> {
    const url = `${this._config.url}/${layerId}`;
    try {
      return await getLayer({
        url,
        authentication: this._identityManager
      });
    } catch (error) {
      throw new Error(`Error querying layer info: ${error}`);
    }
  }

  async getService(): Promise<any> {
    try {
      return await getService({
        url: this._config.url,
        authentication: this._identityManager,
      });
    } catch (error) {
      throw new Error(`Error getting service: ${error}`);
    }
  }

  // Add feature using applyEdits
  async addFeature(feature: any): Promise<any> {
    try {
      const response = await applyEdits({
        url: this._config.url,
        adds: [feature],
        authentication: this._identityManager,
      });
      return response;
    } catch (error) {
      throw new Error(`Error adding feature: ${error}`);
    }
  }

  // Update feature using applyEdits
  async updateFeature(feature: any): Promise<any> {
    try {
      const response = await applyEdits({
        url: this._config.url,
        updates: [feature],
        authentication: this._identityManager,
      });
      return response;
    } catch (error) {
      throw new Error(`Error updating feature: ${error}`);
    }
  }

  // Delete feature using applyEdits
  async deleteFeature(objectId: string | number): Promise<any> {
    try {
      const response = await applyEdits({
        url: this._config.url,
        deletes: [typeof objectId === 'number' ? objectId : parseInt(objectId as string, 10)],
        authentication: this._identityManager,
      });
      return response;
    } catch (error) {
      throw new Error(`Error deleting feature: ${error}`);
    }
  }

  // Batch operation using applyEdits
  async applyEditsBatch(edits: { add?: any[], update?: any[], delete?: any[] }): Promise<any> {
    try {
      const response = await applyEdits({
        url: this._config.url,
        adds: edits.add || [],
        updates: edits.update || [],
        deletes: edits.delete || [],
        authentication: this._identityManager,
      });
      return response;
    } catch (error) {
      throw new Error(`Error applying edits: ${error}`);
    }
  }
}
