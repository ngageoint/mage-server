import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class MapService {

  private delegate = null;
  private baseLayer = null;
  private feedLayers = {};
  private rasterLayers = {};
  private vectorLayers: any = {};
  private gridLayers = {};
  private listeners = [];
  private observationsById = {};
  private usersById = {};


  private selectBaseLayerSource = new Subject<any>()
  private deselectFeatureInLayerSource = new Subject<any>()
  private featuresChanged = new Subject<any>()

  baseLayer$ = this.selectBaseLayerSource.asObservable()
  deselectFeatureInLayer$ = this.deselectFeatureInLayerSource.asObservable()
  featuresChanged$ = this.featuresChanged.asObservable()

  selectBaseLayer(layer: any): void {
    this.selectBaseLayerSource.next(layer);
  }

  deselectFeatureInLayer(feature: any, layerId: any) {
    this.deselectFeatureInLayerSource.next({
      id: layerId,
      feature: feature
    })
  }

  removeFeatureFromLayer(feature: any, layerId: any) {
    const vectorLayer = this.vectorLayers[layerId];
    delete vectorLayer.featuresById[feature.id];

    this.featuresChanged.next({
      id: layerId,
      removed: [feature]
    })
  }
}
