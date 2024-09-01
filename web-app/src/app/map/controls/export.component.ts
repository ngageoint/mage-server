import { Component, EventEmitter, Output, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { DomEvent } from 'leaflet';

@Component({
  selector: 'map-control-export',
  templateUrl: './export.component.html',
  styleUrls: ['./export.component.scss']
})
export class ExportControlComponent implements AfterViewInit {
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
