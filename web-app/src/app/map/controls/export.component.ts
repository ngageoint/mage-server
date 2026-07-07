import {
  Component,
  EventEmitter,
  Output,
  AfterViewInit,
  ElementRef,
  ViewChild
} from '@angular/core';
import { DomEvent } from 'leaflet';

@Component({
    selector: 'map-control-export',
    templateUrl: './export.component.html',
    styleUrls: ['./export.component.scss'],
    standalone: false
})
export class ExportControlComponent implements AfterViewInit {
  @ViewChild('exportButton') button!: ElementRef<HTMLElement>;

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
