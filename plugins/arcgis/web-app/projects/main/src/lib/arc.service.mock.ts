import { Observable, of } from "rxjs";
import { ArcService } from "dist/main/lib/arc.service";
import { mockArcGISEventResult } from './EventsResult';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from './ArcGISPluginConfig';

// TODO: Remove partial once service is complete without errors
export class MockArcService implements Partial<ArcService> {

  fetchArcConfig(): Observable<ArcGISPluginConfig> {
    return of(defaultArcGISPluginConfig)
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
}