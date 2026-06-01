import { Component, EventEmitter, Output } from '@angular/core';

export enum ZoomDirection {
  IN,
  OUT
}

export interface ZoomEvent {
  direction: ZoomDirection;
}

@Component({
    selector: 'map-control-zoom',
    templateUrl: './zoom.component.html',
    styleUrls: ['./zoom.component.scss'],
    standalone: false
})
export class ZoomComponent {
  @Output() onZoom = new EventEmitter<ZoomEvent>();

  onZoomIn($event: MouseEvent): void {
    $event.stopPropagation();
    this.onZoom.emit({ direction: ZoomDirection.IN });
  }

  onZoomOut($event: MouseEvent): void {
    $event.stopPropagation();
    this.onZoom.emit({ direction: ZoomDirection.OUT });
  }
}
