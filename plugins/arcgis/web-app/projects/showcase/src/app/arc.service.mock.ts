import { Observable, of } from "rxjs";
import { Injectable } from '@angular/core'
import { ArcServiceInterface, FeatureLayer, ValidationRequest } from "../../../main/src/lib/arc.service";
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../../../main/src/lib/ArcGISPluginConfig';
import { MageEvent } from "../../../main/src/lib/arc.service";

export const mockArcGISEventResult1 = Object.freeze<MageEvent>({
  id: 0,
  name: 'test event result name 1',
  forms: [{
    id: 1,
    name: 'test form result name 1',
    fields: [{
      title: 'test field 1'
    }]
  }]
});

export const mockArcGISEventResult2 = Object.freeze<MageEvent>({
  id: 1,
  name: 'test event result name 2',
  forms: [{
    id: 2,
    name: 'test form result name 2',
    fields: [{
      title: 'test field 2'
    }]
  }]
});

export const mockArcGISEventResult3 = Object.freeze<MageEvent>({
  id: 2,
  name: 'test event result name 3',
  forms: [{
    id: 3,
    name: 'test form result name 3',
    fields: [{
      title: 'test field 3'
    }]
  }]
});

@Injectable({
  providedIn: 'root'
})

export class MockArcService implements ArcServiceInterface {
  fetchFeatureServiceLayers(featureServiceUrl: string): Observable<FeatureLayer[]> {
    return of([
      {
        id: 1,
        name: 'Layer 1',
        geometryType: 'esriGeometryPoint',
        events: ['test event result name 1', 'test event result name 2']
      },
      {
        id: 2,
        name: 'Layer 2',
        geometryType: 'esriGeometryPolygon',
        events: ['test event result name 2']
      }
    ]);
  }

  fetchArcConfig(): Observable<ArcGISPluginConfig> {
    return of({
      enabled: true,
      baseUrl: 'https://mock.mage.com',
      intervalSeconds: 60,
      startupIntervalSeconds: 1,
      updateIntervalSeconds: 1,
      batchSize: 100,
      featureServices: [
        {
          url: 'https://mock.service.com/FeatureServer/0',
          layers: [
            {
              layer: 'Layer 1',
              events: ['test event result name 1', 'test event result name 2']
            },
            {
              layer: 'Layer 2',
              events: ['test event result name 2']
            }
          ]
        }
      ],
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
    return of([mockArcGISEventResult1, mockArcGISEventResult2, mockArcGISEventResult3]);
  }

  fetchPopulatedEvents() {
    return of([mockArcGISEventResult1, mockArcGISEventResult2, mockArcGISEventResult3]);
  }

  putArcConfig(config: ArcGISPluginConfig) {}

  removeUserTrack(userTrackId: string): Observable<ArcGISPluginConfig> {
    return of(defaultArcGISPluginConfig);
  }

  removeOperation(operationId: string): Observable<ArcGISPluginConfig> {
    return of(defaultArcGISPluginConfig);
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