import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { LocalStorageService, UserService } from 'src/app/upgrade/ajs-upgraded-providers';
import { AttachmentAction } from '../observation-edit/observation-edit-attachment/observation-edit-attachment-action';

@Component({
  selector: 'observation-attachment',
  templateUrl: './attachment.component.html',
  styleUrls: ['./attachment.component.scss']
})
export class AttachmentComponent implements OnInit {
  @Input() attachment: any
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
    @Inject(UserService) private userService: any,
    @Inject(LocalStorageService) localStorageService: any) {
    this.token = localStorageService.getToken()
  }

  ngOnInit(): void {
    this.canEdit = this.userService.amAdmin && this.edit
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
}
