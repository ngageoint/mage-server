import { ArcGISIdentityManager } from "@esri/arcgis-rest-request"
import { getLayer, getService } from "@esri/arcgis-rest-feature-service";
import { queryFeatures, applyEdits, IQueryFeaturesOptions } from "@esri/arcgis-rest-feature-service";
import { FeatureServiceConfig } from "./types/ArcGISConfig";

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

  // TODO this entire class is a Work in Progress and not used. Currently using @esri/arcgis-rest-request and not arcgis-rest-js.
  // By finishing this class, we can transition from low-level generic requests that leverage ArcGISIdentityManager for auth to higher-level strongly typed requests.


  // Query features using arcgis-rest-js's queryFeatures
  async queryFeatureService(whereClause: string): Promise<any> {
    const queryParams = {
      url: this._config.url,
      where: whereClause,
      authentication: this._identityManager
    } as IQueryFeaturesOptions;

    this._console.log('Querying feature service with params:', queryParams);

    try {
      const response = await queryFeatures(queryParams);
      return response;
    } catch (error) {
      this._console.error('Error details:', error);
      throw new Error(`Error querying feature service: ${(error as any).message}`);
    }
    // try {
    //   const response = await queryFeatures({
    //     url: this._config.url,
    //     where: whereClause,
    //     authentication: this._identityManager,
    //     // outFields: '*',
    //     f: 'json',
    //   });
    //   return response;
    // } catch (error) {
    //   throw new Error(`Error querying feature service: ${error}`);
    // }
  }

  // Generic method to query layer info
  async getLayer(layerId: string | number): Promise<any> {
    const url = `${this._config.url}/${layerId}`;
    try {
      return await getLayer({
        url,
        authentication: this._identityManager
      })
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

  // /**
  //  * Queries an arc feature service.
  //  * @param url The url to the arc feature layer.
  //  * @param callback Function to call once response has been received and parsed.
  //  */
  // async queryFeatureService(config: FeatureServiceConfig, callback: (featureService: FeatureServiceResult) => void) {
  //     const httpClient = new HttpClient(this._console)
  // 	try {
  // 	  const identityManager = await getIdentityManager(config, httpClient)
  // 	  const response = await request(config.url, {
  // 		authentication: identityManager
  // 	  })
  // 	  callback(response as FeatureServiceResult)
  // 	} catch (err) {
  // 	  console.error(`Could not get ArcGIS layer info: ${err}`)
  // 	//   res.status(500).json({ message: 'Could not get ArcGIS layer info', error: err })
  // 	}

  // 	// this._httpClient.sendGetHandleResponse(url, this.parseFeatureService(url, callback))
  // }

  // /**
  //  * Parses the response from the feature service request and sends to the callback.
  //  * @param url The url to the arc feature layer.
  //  * @param callback The callback to call and send the feature service to.
  //  */
  // private parseFeatureService(url: string, callback: (featureService: FeatureServiceResult) => void) {
  // 	return (chunk: any) => {
  // 		this._console.log('Feature Service. url: ' + url + ', response: ' + chunk)
  // 		try {
  // 			const service = JSON.parse(chunk) as FeatureServiceResult
  // 			callback(service)
  // 		} catch (e) {
  // 			this._console.error(e)
  // 		}
  // 	}
  // }

  // /**
  //  * Queries an arc feature layer to get info on the layer.
  //  * @param url The url to the arc feature layer.
  //  * @param infoCallback Function to call once response has been received and parsed.
  //  */
  // async queryLayerInfo(config: FeatureServiceConfig, layerId: string | number, infoCallback: (layerInfo: LayerInfoResult) => void) {
  //     const httpClient = new HttpClient(this._console)
  // 	try {
  // 	  const identityManager = await getIdentityManager(config, httpClient)
  // 	  const response = await request(config.url + '/' + layerId, {
  // 		authentication: identityManager
  // 	  })
  // 	  infoCallback(response as LayerInfoResult)
  // 	} catch (err) {
  // 	  console.error(`Could not get ArcGIS layer info: ${err}`)
  // 	//   res.status(500).json({ message: 'Could not get ArcGIS layer info', error: err })
  // 	}

  //     // this._httpClient.sendGetHandleResponse(url, this.parseLayerInfo(url, infoCallback));
  // }

  // /**
  //  * Parses the response from the request and sends the layer info to the callback.
  //  * @param url The url to the feature layer.
  //  * @param infoCallback The callback to call and send the layer info to.
  //  */
  // private parseLayerInfo(url: string, infoCallback: (layerInfo: LayerInfoResult) => void) {
  // 	return (chunk: any) => {
  // 		this._console.log('Query Layer. url: ' + url + ', response: ' + chunk)
  // 		try {
  // 			const layerInfo = JSON.parse(chunk) as LayerInfoResult
  // 			infoCallback(layerInfo)
  // 		} catch (e) {
  // 			this._console.error(e)
  // 		}
  // 	}
  // }
}
