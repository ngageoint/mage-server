import { Observable, of } from "rxjs";
import { Injectable } from '@angular/core'
import { ArcServiceInterface } from "../../../main/src/lib/arc.service";
import { EventResult } from '../../../main/src/lib/EventsResult';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from '../../../main/src/lib/ArcGISPluginConfig';

export const mockArcGISEventResult = Object.freeze<EventResult>({
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