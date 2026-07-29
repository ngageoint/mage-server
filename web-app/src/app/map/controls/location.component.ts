import {
  Component,
  Output,
  EventEmitter,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Input
} from '@angular/core';
import { DomEvent } from 'leaflet';

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
    styleUrls: ['./location.component.scss'],
    standalone: false
})
export class LocationComponent implements AfterViewInit {
  @ViewChild('locateButton') locateButton!: ElementRef<HTMLElement>;
  @ViewChild('broadcastButton') broadcastButton!: ElementRef<HTMLElement>;

  @Input() state: LocationState;
  @Output() stageChange = new EventEmitter<LocationEvent>();

  LocationState = LocationState;

  ngAfterViewInit(): void {
    if (this.locateButton?.nativeElement) {
      DomEvent.disableClickPropagation(this.locateButton.nativeElement);
    }

    if (this.broadcastButton?.nativeElement) {
      DomEvent.disableClickPropagation(this.broadcastButton.nativeElement);
    }
  }

  onLocate(): void {
    this.stageChange.emit({
      state:
        this.state === LocationState.Off
          ? LocationState.Locate
          : LocationState.Off
    });
  }

  onBroadcast(): void {
    this.stageChange.emit({
      state:
        this.state === LocationState.Broadcast
          ? LocationState.Locate
          : LocationState.Broadcast
    });
  }
}
