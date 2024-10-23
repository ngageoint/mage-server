import { Observable, of } from "rxjs";
import { Injectable } from '@angular/core'
import { ArcServiceInterface, FeatureLayer } from "../../../main/src/lib/arc.service";
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../../../main/src/lib/ArcGISPluginConfig';
import { MageEvent } from "../../../main/src/lib/arc.service";

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
    throw new Error("Method not implemented.");
  }
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