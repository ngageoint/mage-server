import { Component, EventEmitter, Output, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { DomEvent } from 'leaflet';

@Component({
    selector: 'map-control-add-observation',
    templateUrl: './add-observation.component.html',
    styleUrls: ['./add-observation.component.scss'],
    standalone: false
})
export class AddObservationComponent implements AfterViewInit {
  @ViewChild('addObservationButton') button!: ElementRef<HTMLElement>;

  @Output() onAddObservation = new EventEmitter<void>();

  ngAfterViewInit(): void {
    if (this.button?.nativeElement) {
      DomEvent.disableClickPropagation(this.button.nativeElement);
    }
  }

  addObservation($event: MouseEvent): void {
    $event.stopPropagation();
    this.onAddObservation.emit();
  }
}