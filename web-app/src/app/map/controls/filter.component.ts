import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DomEvent } from 'leaflet';

@Component({
  selector: 'map-control-filter',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule
  ],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterControlComponent implements AfterViewInit {
  @ViewChild('filterButton') button!: ElementRef<HTMLElement>;

  @Output() click = new EventEmitter<void>();

  ngAfterViewInit(): void {
    if (this.button?.nativeElement) {
      DomEvent.disableClickPropagation(this.button.nativeElement);
    }
  }

  onClick($event: MouseEvent): void {
    $event.stopPropagation();
    this.click.emit();
  }
}