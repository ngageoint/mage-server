import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { RenderedMapLayer } from '../entities.map-layer';

export interface SimpleStyle {
  stroke?: string;
  fill?: string;
  width?: number;
}

export interface ToggleEvent {
  layer: RenderedMapLayer;
  value: boolean;
}

export interface ZoomEvent {
  layer: RenderedMapLayer;
}

export interface OpacityEvent {
  layer: RenderedMapLayer;
  opacity: number;
}

export interface StyleEvent {
  layer: RenderedMapLayer;
  style: SimpleStyle | null;
}

@Injectable({
  providedIn: 'root'
})
export class MapLayerService {
  private toggleSource = new Subject<ToggleEvent>()
  private zoomSource = new Subject<ZoomEvent>()
  private opacitySource = new Subject<OpacityEvent>()
  private styleSource = new Subject<StyleEvent>()

  toggle$ = this.toggleSource.asObservable()
  zoom$ = this.zoomSource.asObservable()
  opacity$ = this.opacitySource.asObservable()
  style$ = this.styleSource.asObservable()

  toggle(layer: RenderedMapLayer, value: boolean): void {
    this.toggleSource.next({
      layer: layer,
      value: value
    })
  }

  zoom(layer: RenderedMapLayer): void {
    this.zoomSource.next({
      layer: layer
    })
  }

  opacity(layer: RenderedMapLayer, opacity: number): void {
    this.opacitySource.next({
      layer: layer,
      opacity: opacity
    })
  }

  style(layer: RenderedMapLayer, style: SimpleStyle | null): void {
    this.styleSource.next({
      layer: layer,
      style: style
    })
  }
}
