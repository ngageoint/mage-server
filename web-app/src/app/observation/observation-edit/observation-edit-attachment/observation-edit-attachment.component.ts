import { Component, input, linkedSignal, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AttachmentComponent } from '../../attachment/attachment.component';
import { AttachUploadComponent } from '../../attachment/attachment-upload/attachment-upload.component';
import { AttachmentAction } from './observation-edit-attachment-action';

interface AttachmentField {
  title: string,
  name: string,
  value: any[],
  min: number,
  max: number
}

@Component({
    selector: 'observation-edit-attachment',
    templateUrl: './observation-edit-attachment.component.html',
    styleUrls: ['./observation-edit-attachment.component.scss'],
    imports: [MatButtonModule, MatIconModule, AttachmentComponent, AttachUploadComponent]
  })
export class ObservationEditAttachmentComponent implements OnInit {
  formGroup = input.required<UntypedFormGroup>()
  definition = input.required<AttachmentField>()
  url = input<string>()
  attachments = input<any[]>()

  currentAttachments = linkedSignal(() => this.attachments() ?? [])

  control: UntypedFormControl
  uploadId = 0
  uploadAttachments = false

  ngOnInit(): void {
    this.control = this.formGroup().get(this.definition().name) as UntypedFormControl
  }

  allAttachments(): any[] {
    const observationFormId = this.formGroup().get('id')?.value
    const attachments = this.currentAttachments().filter(attachment => {
      return attachment.observationFormId === observationFormId &&
        attachment.fieldName === this.definition().name
    });

    return this.control.value ? attachments.concat(this.control.value) : attachments
  }

  onAttachmentFile(event): void {
    const attachments = this.control.value || []
    const files = Array.from(event.target.files)
    files.forEach((file: File) => {
      const id = this.uploadId++;
      attachments.push({
        id: id,
        formId: this.formGroup().get('formId').value,
        name: file.name,
        size: file.size,
        contentType: file.type,
        action: AttachmentAction.ADD,
        file: file
      })
    })

    this.control.setValue(attachments)
  }

  deleteAttachment(attachmentToDelete): void {
    this.currentAttachments.update(attachments => attachments.filter(attachment => attachment.id !== attachmentToDelete.id))
    attachmentToDelete.action = AttachmentAction.DELETE

    const value = this.control.value || []
    value.push(attachmentToDelete)
    this.control.setValue(value)
  }

  removeAttachment($event): void {
    const attachments = this.control.value || []
    this.control.setValue(attachments.filter(attachment => attachment.id !== $event.id))
  }
}