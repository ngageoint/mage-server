import { Component, Inject, Input, OnInit } from '@angular/core';
import { LocalStorageService, UserService } from 'src/app/upgrade/ajs-upgraded-providers';

@Component({
  selector: 'observation-attachment',
  templateUrl: './attachment.component.html',
  styleUrls: ['./attachment.component.scss']
})
export class AttachmentComponent implements OnInit {
  @Input() observation: any
  @Input() attachment: any
  @Input() clickable: boolean
  @Input() edit: boolean
  @Input() label: string | boolean

  canEdit: boolean
  token: string

  mimeTypes = {
    'png': 'image',
    'jpg': 'image',
    'jpeg': 'image',
    'mp4': 'video',
    'mov': 'video'
  }

  constructor(
    @Inject(UserService) private userService: any,
    @Inject(LocalStorageService) localStorageService: any) {
    this.token = localStorageService.getToken()
  }

  ngOnInit(): void {
    this.canEdit = this.userService.amAdmin && this.edit
  }

  deleteAttachment(): void {
    this.attachment.markedForDelete = true
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
