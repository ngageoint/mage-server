import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Output,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DomEvent } from 'leaflet';

export enum ZoomDirection {
  IN,
  OUT
}

export interface ZoomEvent {
  direction: ZoomDirection;
}

@Component({
  selector: 'map-control-zoom',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule
  ],
  templateUrl: './zoom.component.html',
  styleUrls: ['./zoom.component.scss']
})
export class ZoomComponent implements AfterViewInit {
  @ViewChild('zoomOutButton') zoomOutButton!: ElementRef<HTMLElement>;
  @ViewChild('zoomInButton') zoomInButton!: ElementRef<HTMLElement>;

  @Output() onZoom = new EventEmitter<ZoomEvent>();

  ngAfterViewInit(): void {
    if (this.zoomOutButton?.nativeElement) {
      DomEvent.disableClickPropagation(this.zoomOutButton.nativeElement);
    }

    if (this.zoomInButton?.nativeElement) {
      DomEvent.disableClickPropagation(this.zoomInButton.nativeElement);
    }
  }

  onZoomIn($event: MouseEvent): void {
    $event.stopPropagation();
    this.onZoom.emit({ direction: ZoomDirection.IN });
  }

  onZoomOut($event: MouseEvent): void {
    $event.stopPropagation();
    this.onZoom.emit({ direction: ZoomDirection.OUT });
  }
}
