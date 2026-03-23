import { HttpEvent, HttpEventType, HttpResponseBase } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { AttachmentAction } from '../../observation-edit/observation-edit-attachment/observation-edit-attachment-action';
import { AttachmentService } from '../attachment.service';

export interface FileUpload {
  id: number | string;
  name: string;
  formControl: UntypedFormControl;
  attachmentId: string;
  action: AttachmentAction;
  file: File;
  preview?: string;
  uploading?: boolean;
  uploadProgress?: number;
}

enum PreviewType {
  LOADING, IMAGE, VIDEO, AUDIO, UNKNOWN
}

@Component({
  selector: 'attachment-upload',
  templateUrl: './attachment-upload.component.html',
  styleUrls: ['./attachment-upload.component.scss']
})
export class AttachUploadComponent implements OnChanges {
  @Input() attachment: FileUpload;
  @Input() url: string;
  @Input() attachments: FileUpload[]; // for multi-file

  @Output() remove = new EventEmitter<{ id: number | string }>();
  @Output() upload = new EventEmitter<{ id: number | string, response: HttpResponseBase }>();
  @Output() error = new EventEmitter<{ id: number | string }>();

  preview: PreviewType = PreviewType.LOADING;
  previewType = PreviewType;
  attachmentsToUpload = 0;
  actions: typeof AttachmentAction = AttachmentAction;

  constructor(private changeDetector: ChangeDetectorRef, private attachmentService: AttachmentService) { }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle attachment previews
    if (changes.attachment && this.attachment) {
      if (this.attachment.file.type.match('image')) {
        this.preview = PreviewType.LOADING;
        this.previewImage(this.attachment)
          .then(() => this.preview = PreviewType.IMAGE)
          .catch(() => this.preview = PreviewType.UNKNOWN);
      } else if (this.attachment.file.type.match('video')) {
        this.preview = PreviewType.LOADING;
        this.previewVideo(this.attachment)
          .then(() => this.preview = PreviewType.VIDEO)
          .catch(() => this.preview = PreviewType.UNKNOWN);
      } else if (this.attachment.file.type.match('audio')) {
        this.preview = PreviewType.AUDIO;
      } else {
        this.preview = PreviewType.UNKNOWN;
      }
    }

    // Start upload automatically if URL is set
    if (changes.url && changes.url.currentValue) {
      if (this.attachments && this.attachments.length > 1) {
        this.startMultiUpload();
      } else {
        this.startUpload();
      }
    }
  }

  removeAttachment(id: number): void {
    this.remove.emit({ id: id });
  }

  // Image preview
  previewImage(info: FileUpload): Promise<void> {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = (e: Event) => {
        info.preview = (e.target as FileReader).result as string;
        this.changeDetector.detectChanges();
        resolve();
      };
      reader.readAsDataURL(info.file);
    });
  }

  // Video preview
  previewVideo(info: FileUpload): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as ArrayBuffer | null;
        if (result) {
          const blob = new Blob([result], { type: info.file.type });
          const url = URL.createObjectURL(blob);
          const video = document.createElement('video');

          video.addEventListener('loadeddata', () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              info.preview = canvas.toDataURL();
              URL.revokeObjectURL(url);
              this.changeDetector.detectChanges();
              resolve();
            } else reject();
          });

          video.addEventListener('error', () => reject());
          video.preload = 'metadata';
          video.src = url;
          video.muted = true;
          video.play();
        } else reject();
      };
      reader.readAsArrayBuffer(info.file);
    });
  }

  // Toast handler for multi-line messages
  private showToast(messages: string[], type: 'success' | 'error' = 'success', offset = 0) {
    const toast = document.createElement('div');
    toast.innerHTML = messages.join('<br>');

    toast.style.position = 'fixed';
    toast.style.top = `${20 + offset}px`;
    toast.style.right = '20px';
    toast.style.padding = '10px 16px';
    toast.style.borderRadius = '4px';
    toast.style.color = 'white';
    toast.style.zIndex = '9999';
    toast.style.fontSize = '14px';
    toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
    toast.style.maxWidth = '300px';
    toast.style.wordBreak = 'break-word';
    toast.style.whiteSpace = 'pre-line';

    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 5000);
  }

  // Single file upload
  startUpload(): void {
    if (!this.attachment || !this.url) return;

    console.log(`[UPLOAD] Starting upload for file: ${this.attachment.name}`);
    console.log(`[UPLOAD] Attachment details:`, this.attachment);

    this.attachmentService.upload(this.attachment, this.url).subscribe({
      next: (response: HttpEvent<Object>) => {
        console.log(`[UPLOAD] Response received:`, response);

        if (response.type === HttpEventType.UploadProgress && response.total) {
          this.attachment.uploading = true;
          this.attachment.uploadProgress = Math.round(100 * response.loaded / response.total);
          console.log(`[UPLOAD PROGRESS] File: ${this.attachment.name}, Progress: ${this.attachment.uploadProgress}%`);
        }

        if (response.type === HttpEventType.Response) {
          const httpResponse = response as import('@angular/common/http').HttpResponse<any>;
          const body = httpResponse.body;

          console.log(`[UPLOAD RESPONSE] Response body: ${JSON.stringify(body)}`);

          if (body?.failures?.length > 0) {
            const failure = body.failures[0];
            console.error(`[UPLOAD ERROR] File rejected: ${this.attachment.name} - Error: ${failure.error}`);
            console.log(`[UPLOAD ERROR] Failure details:`, failure);

            this.error.emit({ id: this.attachment.id });
            this.showToast([`Failed: ${this.attachment.name} - ${failure.error}`], 'error', 40);
            return;
          }

          if (httpResponse.status === 200) {
            console.log(`[UPLOAD SUCCESS] File uploaded successfully: ${this.attachment.name}`);
            this.upload.emit({ id: this.attachment.id, response: httpResponse });
            this.showToast([`Upload Success: ${this.attachment.name}`], 'success', 0);
          } else {
            console.error(`[UPLOAD ERROR] File upload failed: ${this.attachment.name}`);
            this.error.emit({ id: this.attachment.id });
            this.showToast([`Upload Failed: ${this.attachment.name}`], 'error', 40);
          }
        }
      },
      error: (err) => {
        console.error(`[UPLOAD ERROR] Upload error for file: ${this.attachment.name}, Error: ${err.message}`);
        this.error.emit({ id: this.attachment.id });
        this.showToast([`Failed: ${this.attachment.name} - ${err.message}`], 'error', 40);
      }
    });
  }

  // Multi-file upload
  startMultiUpload(): void {
    if (!this.attachments || !this.url) return;

    const successFiles: string[] = [];
    const failureFiles: string[] = [];
    let completed = 0;

    this.attachments.forEach(att => {
      this.attachmentService.upload(att, this.url).subscribe({
        next: (response: HttpEvent<Object>) => {
          if (response.type === HttpEventType.Response) {
            const body = (response as any).body;
            if (body?.failures?.length) {
              failureFiles.push(`${att.name} - ${body.failures[0].error}`);
              this.error.emit({ id: att.id });
            } else {
              successFiles.push(att.name);
              this.upload.emit({ id: att.id, response });
            }
          }
          completed++;
          if (completed === this.attachments.length) {
            if (successFiles.length) this.showToast([`Success:\n${successFiles.join('\n')}`], 'success', 0);
            if (failureFiles.length) this.showToast([`Failed:\n${failureFiles.join('\n')}`], 'error', 40);
          }
        },
        error: (err) => {
          failureFiles.push(`${att.name} - ${err.message}`);
          this.error.emit({ id: att.id });
          completed++;
          if (completed === this.attachments.length) {
            if (successFiles.length) this.showToast([`Success:\n${successFiles.join('\n')}`], 'success', 0);
            if (failureFiles.length) this.showToast([`Failed:\n${failureFiles.join('\n')}`], 'error', 40);
          }
        }
      });
    });
  }
}