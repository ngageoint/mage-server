import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AttachmentAction } from '../observation-edit/observation-edit-attachment/observation-edit-attachment-action';
import { SessionService } from 'mage-web-app/http/session.service';
import { Attachment, AttachmentProcessingStatus } from '../../filter/filter.types'

@Component({
    selector: 'observation-attachment',
    templateUrl: './attachment.component.html',
    styleUrls: ['./attachment.component.scss'],
    standalone: false
})
export class AttachmentComponent implements OnInit {
  @Input() attachment: Attachment
  @Input() clickable: boolean
  @Input() edit: boolean
  @Input() label: string | boolean

  @Output() delete = new EventEmitter<void>()

  canEdit: boolean
  token: string

  mimeTypes = {
    'png': 'image',
    'jpg': 'image',
    'jpeg': 'image',
    'mp4': 'video',
    'mov': 'video'
  }

  actions: typeof AttachmentAction = AttachmentAction

  constructor(
    private sessionService: SessionService,
    private snackBar: MatSnackBar
  ) {
    this.token = sessionService.getToken()
  }

  ngOnInit(): void {
    this.canEdit = this.sessionService.amAdmin && this.edit
  }

  deleteAttachment(): void {
    this.delete.emit()
  }

  contentType(): string {
    if (this.attachment.contentType) {
      const types = this.attachment.contentType.split('/')
      return types.length ? types[0] : ''
    } else {
      const extension = this.attachment.name.substr(this.attachment.name.lastIndexOf('.') + 1)
      const mimeType = this.mimeTypes[extension]
      return mimeType ? mimeType : ''
    }
  }

  isFailed(): boolean {
    return this.attachment.processingStatus === AttachmentProcessingStatus.Rejected || this.attachment.processingStatus === AttachmentProcessingStatus.Error
  }

  showFailureMessage(): void {
    this.snackBar.open(this.attachment.processingMessage, 'Dismiss', { duration: 6000 })
  }
}
