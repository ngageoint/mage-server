import { Directive, ElementRef, Injector, Output, EventEmitter } from '@angular/core';
import { UpgradeComponent } from '@angular/upgrade/static';

@Directive({
  selector: 'leaflet'
})
export class LeafletDirective extends UpgradeComponent {
  @Output() onMapAvailable: EventEmitter<any>;
  @Output() onAddObservation: EventEmitter<any>;
  @Output() onAddLayer: EventEmitter<any>;
  @Output() onRemoveLayer: EventEmitter<any>;

  constructor(elementRef: ElementRef, injector: Injector) {
    super('leaflet', elementRef, injector);
  }
}