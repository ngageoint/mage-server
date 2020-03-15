import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface SimpleStyle {
  stroke?: string;
  fill?: string;
  width?: number;
}

export interface ToggleEvent {
  layer: any;
  value: number | boolean;
}

export interface ZoomEvent {
  layer: any;
}

export interface OpacityEvent {
  layer: any;
  opacity: number;
}

export interface StyleEvent {
  layer: any;
  style: SimpleStyle;
}

@Injectable()
export class LayerService {
  private toggleSource = new Subject<ToggleEvent>();
  private zoomSource = new Subject<ZoomEvent>();
  private opacitySource = new Subject<OpacityEvent>();
  private styleSource = new Subject<StyleEvent>();

  toggle$ = this.toggleSource.asObservable();
  zoom$ = this.zoomSource.asObservable();
  opacity$ = this.opacitySource.asObservable();
  style$ = this.styleSource.asObservable();

  toggle(layer: any, value: boolean): void {
    this.toggleSource.next({
      layer: layer,
      value: value
    });
  }

  zoom(layer: any): void {
    this.zoomSource.next({
      layer: layer
    });
  }

  opacity(layer: any, opacity: number): void {
    this.opacitySource.next({
      layer: layer,
      opacity: opacity
    });
  }

  style(layer: any, style: SimpleStyle): void {
    this.styleSource.next({
      layer: layer,
      style: style
    });
  }
}
