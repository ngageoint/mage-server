import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

interface AttachmentField {
  title: string,
  name: string,
  value: any[],
  min: number,
  max: number
}

export enum AttachmentRequestType {
  ADD,
  REMOVE
}

@Component({
  selector: 'observation-edit-attachment',
  templateUrl: './observation-edit-attachment.component.html',
  styleUrls: ['./observation-edit-attachment.component.scss']
})
export class ObservationEditAttachmentComponent implements OnInit {
  @Input() formGroup: FormGroup
  @Input() definition: AttachmentField
  @Input() url: string
  @Input() attachments: any[]

  control: FormControl
  uploadId = 0
  uploadAttachments = false

  constructor(private changeDetector: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.control = this.formGroup.get(this.definition.name) as FormControl
  }

  trackByAttachment(index: number, attachment: any): any {
    return attachment.id
  }

  allAttachments(): any[] {
    const observationFormId = this.formGroup.get('id')?.value
    const attachments = (this.attachments || []).filter(attachment => {
      return attachment.url &&
        attachment.observationFormId === observationFormId &&
        attachment.fieldName === this.definition.name
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
        formId: this.formGroup.get('formId').value,
        name: file.name,
        size: file.size,
        type: file.type,
        requestType: AttachmentRequestType.ADD,
        file: file
      })
    })

    this.control.setValue(attachments)

    this.changeDetector.detectChanges()
  }

  removeAttachment($event): void {
    const attachments = this.control.value || []
    this.control.setValue(attachments.filter(attachment => attachment.id !== $event.id))
  }
}