import { Component, Input } from '@angular/core';

@Component({
  selector: 'observation-view-attachment',
  templateUrl: './observation-view-attachment.component.html',
  styleUrls: ['./observation-view-attachment.component.scss']
})
export class ObservationViewAttachmentComponent {
  private _attachments: any[];

  @Input() form: any
  @Input() field: any
  @Input()
  set attachments(attachments: any[]) {
    this._attachments = attachments.filter(attachment => {
      return attachment.observationFormId === this.form.remoteId &&
        attachment.fieldName === this.field.name
    })
  }
  get attachments(): any[] {
    return this._attachments;
  }
}
