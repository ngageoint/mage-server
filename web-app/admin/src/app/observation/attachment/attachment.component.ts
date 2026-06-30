import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { take } from 'rxjs/operators';

import { LocalStorageService } from 'src/app/http/local-storage.service';
import { AdminUserService } from '../../admin/services/admin-user.service';

import { AttachmentAction } from '../observation-edit/observation-edit-attachment/observation-edit-attachment-action';

@Component({
  selector: 'observation-attachment',
  templateUrl: './attachment.component.html',
  styleUrls: ['./attachment.component.scss']
})
export class AttachmentComponent implements OnInit {
  @Input() attachment: any;
  @Input() clickable: boolean;
  @Input() edit: boolean;
  @Input() label: string | boolean;

  @Output() delete = new EventEmitter<void>();

  canEdit: boolean;
  token: string;

  mimeTypes: Record<string, string> = {
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    mp4: 'video',
    mov: 'video'
  };

  actions: typeof AttachmentAction = AttachmentAction;

  constructor(
    private adminUserService: AdminUserService,
    private localStorageService: LocalStorageService
  ) {
    this.token = this.localStorageService.getToken();
  }

  ngOnInit(): void {
    this.adminUserService.isAdmin$
      .pipe(take(1))
      .subscribe((isAdmin) => {
        this.canEdit = !!isAdmin && !!this.edit;
      });
  }

  deleteAttachment(): void {
    this.delete.emit();
  }

  contentType(): string {
    if (this.attachment?.contentType) {
      const types = this.attachment.contentType.split('/');
      return types.length ? types[0] : '';
    }

    const name = String(this.attachment?.name ?? '');
    const lastDot = name.lastIndexOf('.');
    const extension = lastDot >= 0 ? name.substring(lastDot + 1).toLowerCase() : '';
    return this.mimeTypes[extension] || '';
  }
}
