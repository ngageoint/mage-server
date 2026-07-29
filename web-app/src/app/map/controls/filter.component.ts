import { Component, EventEmitter, Output, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { DomEvent } from 'leaflet';

@Component({
    selector: 'map-control-filter',
    templateUrl: './filter.component.html',
    styleUrls: ['./filter.component.scss'],
    standalone: false
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