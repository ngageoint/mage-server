import { Component, EventEmitter, Output, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { DomEvent } from 'leaflet';

@Component({
  selector: 'map-control-filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterControlComponent implements AfterViewInit {
  @ViewChild(MatButton, { read: ElementRef }) button: ElementRef;

  @Output() click = new EventEmitter<void>();

  ngAfterViewInit(): void {
    DomEvent.disableClickPropagation(this.button.nativeElement);
  }

  onClick($event: MouseEvent): void {
    $event.stopPropagation();
    this.click.emit();
  }
}
