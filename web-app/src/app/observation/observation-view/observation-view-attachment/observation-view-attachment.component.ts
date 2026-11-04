import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { AttachmentComponent } from '../../attachment/attachment.component';

@Component({
    selector: 'observation-view-attachment',
    templateUrl: './observation-view-attachment.component.html',
    styleUrls: ['./observation-view-attachment.component.scss'],
    imports: [CommonModule, MatGridListModule, AttachmentComponent]
})
export class ObservationViewAttachmentComponent {
  form = input<any>()
  field = input<any>()
  allAttachments = input<any[]>([], { alias: 'attachments' })

  attachments = computed(() => {
    const form = this.form()
    const field = this.field()
    return this.allAttachments().filter(attachment => {
      return attachment.observationFormId === form?.remoteId &&
        attachment.fieldName === field?.name
    })
  })
}
