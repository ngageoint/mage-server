import { Component, Output, EventEmitter, AfterViewInit, ViewChild, ElementRef, ViewChildren, QueryList } from '@angular/core';
import L from 'leaflet';
import { MatButton } from '@angular/material';

export enum LocationState {
  ON,
  OFF
}

export interface LocationEvent {
  state: LocationState;
}

@Component({
  selector: 'map-control-location',
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss']
})
export class LocationComponent implements AfterViewInit {
  @ViewChildren(MatButton, { read: ElementRef }) buttons: QueryList<ElementRef>;

  @Output() onLocate = new EventEmitter<LocationEvent>();
  @Output() onBroadcast = new EventEmitter<LocationEvent>();

  LocationState = LocationState;
  locateState = LocationState.OFF;
  broadcastState = LocationState.OFF;

  ngAfterViewInit(): void {
    L.DomEvent.disableClickPropagation(this.buttons.first.nativeElement);
    L.DomEvent.disableClickPropagation(this.buttons.last.nativeElement);
  }

  locate() {
    this.locateState = this.locateState === LocationState.ON ? LocationState.OFF : LocationState.ON;

    if (this.locateState === LocationState.OFF && this.broadcastState === LocationState.ON) {
      this.broadcast();
    }

    this.onLocate.emit({ state: this.locateState });
  }

  broadcast() {
    this.broadcastState = this.broadcastState === LocationState.ON ? LocationState.OFF : LocationState.ON;

    if (this.broadcastState === LocationState.ON && this.locateState === LocationState.OFF) {
      this.locate();
    }

    this.onBroadcast.emit({ state: this.broadcastState });
  }

}
