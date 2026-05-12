import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DomEvent } from 'leaflet';

@Component({
  selector: 'map-control-add-observation',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule
  ],
  templateUrl: './add-observation.component.html',
  styleUrls: ['./add-observation.component.scss']
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