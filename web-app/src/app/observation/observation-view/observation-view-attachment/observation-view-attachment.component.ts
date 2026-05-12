import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { AttachmentComponent } from 'mage-web-app/observation/attachment/attachment.component';

@Component({
  selector: 'observation-view-attachment',
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    AttachmentComponent
  ],
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
