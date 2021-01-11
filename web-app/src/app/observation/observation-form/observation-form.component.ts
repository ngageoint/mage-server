import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'observation-form',
  templateUrl: './observation-form.component.html',
  styleUrls: ['./observation-form.component.scss']
})
export class ObservationFormComponent {
  @Input() forms: any

  @Output() selected = new EventEmitter<any>()
  @Output() close = new EventEmitter<void>()

  onSelected(form): void {
    this.selected.emit(form)
  }

  onClose(): void {
    this.close.emit();
  }

  trackByFormId(index: number, form: any): any {
    return form.id
  } 

}
