import { Component, EventEmitter, Output, AfterViewInit, ViewChildren, ElementRef, QueryList } from '@angular/core';
import L from 'leaflet';
import { MatButton } from '@angular/material';

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
  styleUrls: ['./zoom.component.scss']
})
export class ZoomComponent implements AfterViewInit {
  @ViewChildren(MatButton, { read: ElementRef }) buttons: QueryList<ElementRef>;

  @Output() onZoom = new EventEmitter<ZoomEvent>();

  ngAfterViewInit(): void {
    L.DomEvent.disableClickPropagation(this.buttons.first.nativeElement);
    L.DomEvent.disableClickPropagation(this.buttons.last.nativeElement);
  }

  onZoomIn($event: MouseEvent) {
    $event.stopPropagation();
    this.onZoom.emit({direction: ZoomDirection.IN})
  }

  onZoomOut($event: MouseEvent) {
    $event.stopPropagation();
    this.onZoom.emit({ direction: ZoomDirection.OUT })
  }

}
