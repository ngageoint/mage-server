import { Component, EventEmitter, Output, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { MatButton } from '@angular/material';
import { DomEvent } from 'leaflet';

@Component({
  selector: 'map-control-add-observation',
  templateUrl: './add-observation.component.html',
  styleUrls: ['./add-observation.component.scss']
})
export class AddObservationComponent implements AfterViewInit {
  @ViewChild(MatButton, { read: ElementRef, static: false }) button: ElementRef;

  @Output() onAddObservation = new EventEmitter<void>();

  ngAfterViewInit(): void {
    DomEvent.disableClickPropagation(this.button.nativeElement);
  }

  addObservation($event: MouseEvent): void {
    $event.stopPropagation();
    this.onAddObservation.emit();
  }
}
