import { Component, Output, EventEmitter, AfterViewInit, ElementRef, ViewChildren, QueryList, Input } from '@angular/core';
import { DomEvent } from 'leaflet';
import { MatButton } from '@angular/material/button';

export enum LocationState {
  Off,
  Locate,
  Broadcast
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

  @Input() state: LocationState
  @Output() stageChange = new EventEmitter<LocationEvent>()

  LocationState = LocationState

  ngAfterViewInit(): void {
    DomEvent.disableClickPropagation(this.buttons.first.nativeElement)
    DomEvent.disableClickPropagation(this.buttons.last.nativeElement)
  }

  onLocate(): void {
    this.stageChange.emit({ state: this.state === LocationState.Off ? LocationState.Locate : LocationState.Off })
  }

  onBroadcast(): void {
    this.stageChange.emit({ state: this.state === LocationState.Broadcast ? LocationState.Locate : LocationState.Broadcast })
  }

}
