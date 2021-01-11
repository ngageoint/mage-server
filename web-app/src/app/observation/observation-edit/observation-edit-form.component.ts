import { Component, EventEmitter, Input, Output } from '@angular/core'

@Component({
  selector: 'observation-edit-form',
  templateUrl: './observation-edit-form.component.html',
  styleUrls: ['./observation-edit-form.component.scss']
})
export class ObservationEditFormComponent {
  @Input() form: any
  @Input() formDefinition: any
  @Input() geometryStyle: any

  @Output() featureEdit = new EventEmitter<any>()

  nonArchivedFields(fields: any[]): any[] {
    return fields.filter(field => !field.archived).sort((a: any, b: any) => a.id - b.id );
  }

  onGeometryEdit($event): void {
    this.featureEdit.emit($event)
  }

  onGeometryChanged($event: any, field: any): void {
    field.value = $event.feature ? $event.feature.geometry : null;
  }

}
