import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { AttachmentAction } from './observation-edit-attachment-action';
import { HttpClient } from '@angular/common/http'; // POC: call backend directly

interface AttachmentField {
  title: string;
  name: string;
  value: any[];
  min: number;
  max: number;
}

@Component({
  selector: 'observation-edit-attachment',
  templateUrl: './observation-edit-attachment.component.html',
  styleUrls: ['./observation-edit-attachment.component.scss']
})
export class ObservationEditAttachmentComponent implements OnInit {
  @Input() formGroup: UntypedFormGroup           // Form group for this observation
  @Input() definition: AttachmentField           // Attachment field metadata
  @Input() url: string                            // Base URL for backend
  @Input() attachments: any[] = []               // Existing attachments

  control: UntypedFormControl
  uploadId = 0                                   // Local ID for new attachments

  constructor(
    private changeDetector: ChangeDetectorRef,
    private http: HttpClient                      // Direct backend calls for POC
  ) {}

  ngOnInit(): void {
    // Connect form control for this attachment field
    this.control = this.formGroup.get(this.definition.name) as UntypedFormControl
  }

  trackByAttachment(index: number, attachment: any): any {
    return attachment.id
  }

  allAttachments(): any[] {
    // Combine existing attachments and control values for this field
    const observationFormId = this.formGroup.get('id')?.value
    const attachments = (this.attachments || []).filter(a =>
      a.url &&
      a.observationFormId === observationFormId &&
      a.fieldName === this.definition.name
    )
    return this.control.value ? attachments.concat(this.control.value) : attachments
  }

  onAttachmentFile(event): void {
    // Add newly selected files to control value
    const attachments = this.control.value || []
    const files = Array.from(event.target.files)
    files.forEach((file: File) => {
      const id = this.uploadId++
      attachments.push({
        id,
        formId: this.formGroup.get('formId').value,
        name: file.name,
        size: file.size,
        contentType: file.type,
        action: AttachmentAction.ADD,
        file
      })
    })
    this.control.setValue(attachments)
    this.changeDetector.detectChanges()

    console.log('Files added to control:', attachments) // <-- POC debug
  }

  deleteAttachment(attachmentToDelete): void {
    // Mark attachment for deletion and update control
    this.attachments = this.attachments.filter(a => a.id !== attachmentToDelete.id)
    attachmentToDelete.action = AttachmentAction.DELETE

    const value = this.control.value || []
    value.push(attachmentToDelete)
    this.control.setValue(value)

    console.log('Attachment marked for deletion:', attachmentToDelete) // <-- POC debug
  }

  removeAttachment($event): void {
    // Remove attachment from the control value only
    const attachments = this.control.value || []
    this.control.setValue(attachments.filter(a => a.id !== $event.id))

    console.log('Attachment removed from control:', $event) // <-- POC debug
  }

  // ----------------------
  // POC: Upload attachments and show toast messages
  // ----------------------
  uploadAttachmentsToBackend(): void {
    const attachments = this.control.value || []
    if (!attachments.length) return

    const observationId = this.formGroup.get('id')?.value
    if (!observationId) {
      this.showToast('Observation ID missing')
      console.warn('Upload aborted: observation ID missing') // <-- POC debug
      return
    }

    console.log('Uploading attachments for observation ID:', observationId, attachments) // <-- POC debug

    // PUT request to backend to save attachments
    this.http.put<any>(`${this.url}/${observationId}/attachments`, attachments)
      .subscribe({
        next: (response) => {
          console.log('Backend response:', response) // <-- log entire backend response

          // Show toast for each successful attachment
          response.successes?.forEach(a => {
            console.log('SUCCESS:', a.name) // <-- POC debug
            this.showToast(`${a.name} uploaded successfully`)
          })

          // Show toast for each failed attachment
          response.failures?.forEach(f => {
            console.log('FAILURE:', f.file, f.error) // <-- POC debug
            this.showToast(`${f.file} failed: ${f.error}`)
          })

          // Update form control with backend-returned attachments
          console.log('Updated form control value BEFORE set:', this.control.value) // <-- POC debug
          this.control.setValue(response.updatedAttachments || [])
          console.log('Updated form control value AFTER set:', this.control.value) // <-- POC debug
          this.changeDetector.detectChanges()
        },
        error: (err) => {
          console.error('Attachment upload error:', err) // <-- log full error
          this.showToast(`Attachment upload failed: ${err.message || err}`)
        }
      })
  }

  // ----------------------
  // Minimal toast function for POC
  // Replace with Angular Material Snackbar or similar for production
  // ----------------------
  private showToast(message: string): void {
    alert(message)  // Simple placeholder toast
    console.log('TOAST:', message) // <-- POC debug
  }
}