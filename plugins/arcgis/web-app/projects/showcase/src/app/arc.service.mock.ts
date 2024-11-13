import { Observable, of } from "rxjs";
import { Injectable } from '@angular/core'
import { ArcServiceInterface, FeatureLayer, ValidationRequest } from "../../../main/src/lib/arc.service";
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../../../main/src/lib/ArcGISPluginConfig';
import { MageEvent } from "../../../main/src/lib/arc.service";
import { FeatureServiceConfig } from "projects/main/src/lib/ArcGISConfig";

export const mockArcGISEventResult = Object.freeze<MageEvent>({
  id: 0,
  name: 'test event result name',
  forms: [{
    id: 1,
    name: 'test form result name',
    fields: [{
      title: 'test field'
    }]
  }]
})

@Injectable({
  providedIn: 'root'
})
export class MockArcService implements ArcServiceInterface {
  fetchFeatureServiceLayers(featureServiceUrl: string): Observable<FeatureLayer[]> {
    return of([{
      id: 0,
      name: 'mock_arcgis_layer',
      geometryType: 'point'
    }])
  }
  fetchArcConfig(): Observable<ArcGISPluginConfig> {
    return of({
      enabled: true,
      baseUrl: 'https://mock.mage.com',
      intervalSeconds: 60,
      startupIntervalSeconds: 1,
      updateIntervalSeconds: 1,
      batchSize: 100,
      featureServices: [{
        url: 'https://arcgis.mock.com/1',
        authenticated: false,
        layers: [{
          layer: 'Mock ArcGIS Layer 1'
        },{
          layer: 'Mock ArcGIS Layer 2'
        }]
      },{
        url: 'https://arcgis.mock.com/2',
        authenticated: true,
        layers: [{
          layer: 'Mock ArcGIS Layer 1'
        }]
      }],
      attachmentModifiedTolerance: 5000,
      textFieldLength: 100,
      textAreaFieldLength: 256,
      observationIdField: 'mock_description',
      idSeparator: 'mock-',
      eventIdField: 'mock_event_id',
      lastEditedDateField: 'mock_last_edited_date',
      eventNameField: 'mock_event_name',
      userIdField: 'mock_user_id',
      usernameField: 'mock_username',
      userDisplayNameField: 'mock_user_display_name',
      deviceIdField: 'mock_device_id',
      createdAtField: 'mock_created_at',
      lastModifiedField: 'mock_last_modified',
      geometryType: 'mock_geometry_type',
      fieldAttributes: {},
      attributes: {
        'symbolid': {
          defaults: [
            {
              value: 3,
              condition: [
                { attribute: 'geometry_type', values: ['esriGeometryPolyline'] }
              ]
            },
            {
              value: 1,
              condition: [
                { attribute: 'geometry_type', values: ['esriGeometryPolygon'] }
              ]
            }
          ]
        }
      }
    })
  }

  fetchArcLayers(featureUrl: string) {
    return of({
      layers: [
          {
            id: 0, 
            name: 'mage_sync', 
            geometryType: 'esriGeometryPoint'
          },
        ]
      }
    )
  }

  fetchEvents() {
    return of([mockArcGISEventResult])
  }

  fetchPopulatedEvents() {
    return of([mockArcGISEventResult])
  }

  putArcConfig(config: ArcGISPluginConfig) {}

  removeUserTrack(userTrackId: string): Observable<ArcGISPluginConfig> {
    return of(
      defaultArcGISPluginConfig
    )
  }

  removeOperation(operationId: string): Observable<ArcGISPluginConfig> {
    return of(
      defaultArcGISPluginConfig
    )
  }

  validateFeatureService(request: ValidationRequest): Observable<FeatureServiceConfig> {
      return of({
        url: 'https://arcgis.mock.com/1',
        authenticated: true,
        layers: [{
          layer: 'Mock ArcGIS Layer 1'
        }]
      })
  }
}