import { AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core'
import { DomEvent } from 'leaflet'

@Component({
  selector: 'map-control-osm',
  template: `<button #osmButton mat-mini-fab class="map-control-fab" matTooltip="Search OpenStreetMap"
    matTooltipPosition="after" aria-label="Search OpenStreetMap" (click)="onClick($event)">
    <mat-icon>travel_explore</mat-icon></button>`,
  styles: [`.map-control-fab { background-color: #ffffff; color: #1e5a8a; --mat-fab-small-container-color: #ffffff; --mat-fab-small-foreground-color: var(--mat-sys-primary, #1e5a8a); }`],
  standalone: false
})
export class OsmControlComponent implements AfterViewInit {
  @ViewChild('osmButton') button!: ElementRef<HTMLElement>
  @Output() openOsm = new EventEmitter<void>()

  ngAfterViewInit(): void {
    if (this.button?.nativeElement) DomEvent.disableClickPropagation(this.button.nativeElement)
  }

  onClick($event: MouseEvent): void {
    $event.stopPropagation()
    this.openOsm.emit()
  }
}
