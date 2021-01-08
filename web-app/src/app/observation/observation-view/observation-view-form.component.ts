import { Component, Input } from '@angular/core';

@Component({
  selector: 'observation-view-form',
  templateUrl: './observation-view-form.component.html',
  styleUrls: ['./observation-view-form.component.scss']
})
export class ObservationViewFormComponent {
  @Input() form: any

  nonArchivedFields(fields: any[]): any[] {
    return fields
      .filter(field => !field.archived)
      .sort((a: { id: number }, b: { id: number }) => a.id - b.id);
  }
}
