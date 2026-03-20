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
  @Input() attachments: FileUpload[]; // For multi-file uploads

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

  // Custom toast
  private showToast(message: string, type: 'success' | 'error' = 'success') {
    const toast = document.createElement('div');
    toast.innerText = message;
  
    toast.style.position = 'fixed';
    toast.style.right = '20px';
    toast.style.padding = '10px 16px';
    toast.style.borderRadius = '4px';
    toast.style.color = 'white';
    toast.style.zIndex = '9999';
    toast.style.fontSize = '14px';
    toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
  
    // Position to stack: success on top, errors underneath
    const existingToasts = Array.from(document.body.querySelectorAll('.toast')) as HTMLDivElement[];
    toast.classList.add('toast');
    toast.style.top = `${20 + existingToasts.length * 60}px`; // 60px spacing between toasts
  
    document.body.appendChild(toast);
  
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 5000);
  }

  // Single-file upload
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
            this.showToast(`File rejected: ${this.attachment.name} - ${failure.error}`, 'error');
            return;
          }

          if (httpResponse.status === 200) {
            console.log(`[UPLOAD SUCCESS] File uploaded successfully: ${this.attachment.name}`);
            this.showToast(`Upload Success: ${this.attachment.name}`, 'success');
            this.upload.emit({ id: this.attachment.id, response: httpResponse });
          } else {
            console.error(`[UPLOAD ERROR] File upload failed: ${this.attachment.name}`);
            this.error.emit({ id: this.attachment.id });
            this.showToast(`Upload failed: ${this.attachment.name}`, 'error');
          }
        }
      },
      error: (err) => {
        console.error(`[UPLOAD ERROR] Upload error for file: ${this.attachment.name}, Error: ${err.message}`);
        this.error.emit({ id: this.attachment.id });
        this.showToast(`Upload failed due to error: ${err.message}`, 'error');
      }
    });
  }

  // Multi-file upload with combined toasts
  startMultiUpload(): void {
    if (!this.attachments || !this.url || this.attachments.length === 0) return;

    const successes: string[] = [];
    const failures: string[] = [];

    this.attachments.forEach((file) => {
      this.attachmentService.upload(file, this.url).subscribe({
        next: (response: HttpEvent<Object>) => {
          if (response.type === HttpEventType.Response) {
            const httpResponse = response as import('@angular/common/http').HttpResponse<any>;
            const body = httpResponse.body;

            if (body?.failures?.length > 0) {
              const failure = body.failures[0];
              failures.push(`${file.name} (${failure.error})`);
              this.error.emit({ id: file.id });
            } else if (httpResponse.status === 200) {
              successes.push(file.name);
              this.upload.emit({ id: file.id, response: httpResponse });
            } else {
              failures.push(`${file.name} (status ${httpResponse.status})`);
              this.error.emit({ id: file.id });
            }

            // After processing last file, show combined toasts
            if (successes.length + failures.length === this.attachments.length) {
              if (successes.length > 0) {
                this.showToast(`Uploaded: ${successes.join(', ')}`, 'success');
              }
              if (failures.length > 0) {
                this.showToast(`Failed: ${failures.join(', ')}`, 'error');
              }
            }
          }
        },
        error: (err) => {
          failures.push(`${file.name} (${err.message})`);
          this.error.emit({ id: file.id });

          if (successes.length + failures.length === this.attachments.length) {
            if (successes.length > 0) {
              this.showToast(`Uploaded: ${successes.join(', ')}`, 'success');
            }
            if (failures.length > 0) {
              this.showToast(`Failed: ${failures.join(', ')}`, 'error');
            }
          }
        }
      });
    });
  }
}