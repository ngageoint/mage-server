import { Component, Output, EventEmitter } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'map-control-layers',
  templateUrl: './layers-control.component.html',
  styleUrls: ['./layers-control.component.scss'],
  animations: [
    trigger('rotatedState', [
      state('default', style({ transform: 'rotate(0)', opacity: 1 })),
      state('rotated', style({
        transform: 'rotate(90deg)',
        opacity: 0
      })),
      transition('rotated => default', animate('200ms ease-out')),
      transition('default => rotated', animate('200ms ease-in'))
    ]),
    trigger('rotatedStateClose', [
      state('default', style({ transform: 'rotate(0deg)', opacity: 0 })),
      state('rotated', style({
        transform: 'rotate(90deg)',
        opacity: 1
      })),
      transition('rotated => default', animate('200ms ease-in')),
      transition('default => rotated', animate('200ms ease-out'))
    ])
  ]
})
export class LayersControlComponent {
  @Output() onLayerPanelToggle = new EventEmitter<void>();

  state = 'default';
  stateClosed = 'default';
  showClose = false;

  toggleLayerMenu(): void {
    this.onLayerPanelToggle.emit();
    this.rotate();
  }

  rotate(): void {
    if (this.state === 'default') {
      this.state = (this.state === 'default' ? 'rotated' : 'default');
    } else {
      this.stateClosed = (this.stateClosed === 'default' ? 'rotated' : 'default');
    }
  }

  onDone(event): void {
    if (event.fromState === 'void') return;

    if (event.toState === 'rotated') {
      this.showClose = true;
      this.stateClosed = (this.stateClosed === 'default' ? 'rotated' : 'default');
    }
  }

  onCloseDone(event): void {
    if (event.fromState === 'void') return;

    if (event.toState === 'default') {
      this.showClose = false;
      this.state = (this.state === 'default' ? 'rotated' : 'default');
    }
  }

}
