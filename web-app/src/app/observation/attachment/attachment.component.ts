import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AttachmentAction } from '../observation-edit/observation-edit-attachment/observation-edit-attachment-action';
import { SessionService } from 'mage-web-app/http/session.service';
import { Attachment, AttachmentProcessingStatus } from '../../entities/observation/entities.observation'

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

  // The list card's carousel sets this false - a click there should only ever navigate to the
  // observation, same as clicking anywhere else on the card, not expand a failure message in
  // place (that's reserved for the detail/edit views where there's room for it to grow into).
  @Input() expandable = true

  @Output() delete = new EventEmitter<void>()

  canEdit: boolean
  token: string
  messageExpanded = false

  mimeTypes = {
    'png': 'image',
    'jpg': 'image',
    'jpeg': 'image',
    'mp4': 'video',
    'mov': 'video'
  }

  actions: typeof AttachmentAction = AttachmentAction

  constructor(
    private sessionService: SessionService
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

  toggleFailureMessage(): void {
    if (!this.expandable) return
    this.messageExpanded = !this.messageExpanded
  }
}
