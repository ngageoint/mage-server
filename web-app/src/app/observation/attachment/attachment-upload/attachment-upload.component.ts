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

  @Output() remove = new EventEmitter<{ id: number | string }>();
  @Output() upload = new EventEmitter<{ id: number | string, response: HttpResponseBase }>();
  @Output() error = new EventEmitter<{ id: number | string }>();

  preview: PreviewType = PreviewType.LOADING;
  previewType = PreviewType;
  attachmentsToUpload = 0;
  actions: typeof AttachmentAction = AttachmentAction;

  constructor(private changeDetector: ChangeDetectorRef, private attachmentService: AttachmentService) { }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges triggered', changes);

    // Handle attachment changes
    if (changes.attachment && this.attachment) {
      console.log('Attachment changed:', this.attachment);

      if (this.attachment.file.type.match('image')) {
        console.log('Image file detected');
        this.preview = PreviewType.LOADING;
        this.previewImage(this.attachment)
          .then(() => { 
            console.log('Image preview loaded successfully');
            this.preview = PreviewType.IMAGE; 
          })
          .catch(() => {
            console.error('Image preview failed');
            this.preview = PreviewType.UNKNOWN;
          });
      } else if (this.attachment.file.type.match('video')) {
        console.log('Video file detected');
        this.preview = PreviewType.LOADING;
        this.previewVideo(this.attachment)
          .then(() => { 
            console.log('Video preview loaded successfully');
            this.preview = PreviewType.VIDEO; 
          })
          .catch(() => {
            console.error('Video preview failed');
            this.preview = PreviewType.UNKNOWN;
          });
      } else if (this.attachment.file.type.match('audio')) {
        console.log('Audio file detected');
        this.preview = PreviewType.AUDIO;
      } else {
        console.log('Unknown file type detected');
        this.preview = PreviewType.UNKNOWN;
      }
    }

    // Start upload if URL changes
    if (changes.url && changes.url.currentValue) {
      console.log('Starting upload for URL:', this.url);
      this.startUpload();
    }
  }

  removeAttachment(id: number): void {
    console.log('Removing attachment with ID:', id);
    this.remove.emit({ id: id });
  }

  // Preview image before upload
  previewImage(info: FileUpload): Promise<void> {
    console.log('Generating image preview for:', info.file.name);
    return new Promise(resolve => {
      const reader = new FileReader();

      reader.onload = (e: Event): void => {
        const target = e.target as FileReader;
        info.preview = target.result as string;
        console.log('Image preview loaded:', info.preview);
        this.changeDetector.detectChanges();
        resolve();
      };

      reader.readAsDataURL(info.file);
    });
  }

  // Preview video before upload
  previewVideo(info: FileUpload): Promise<void> {
    console.log('Generating video preview for:', info.file.name);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (): void => {
        const result = reader.result as ArrayBuffer | null;
        if (result !== null) {
          const blob = new Blob([result], { type: info.file.type });
          const url = URL.createObjectURL(blob);
          const video: HTMLVideoElement = document.createElement('video');

          video.addEventListener('loadeddata', () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) { 
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const image = canvas.toDataURL();
              info.preview = image;
              URL.revokeObjectURL(url);
              this.changeDetector.detectChanges();
              console.log('Video preview loaded:', image);
              resolve();
            } else {
              console.error('Failed to get 2d context from canvas');
              reject();
            }
          });

          video.addEventListener('error', () => {
            console.error('Video preview failed');
            this.changeDetector.detectChanges();
            reject();
          });

          video.preload = 'metadata';
          video.src = url;
          video.muted = true;
          video.play();
        } else {
          console.error('Failed to read file as ArrayBuffer');
          reject();
        }
      };

      reader.readAsArrayBuffer(info.file);
    });
  }

  // Start file upload
  startUpload(): void {
    console.log('Uploading attachment:', this.attachment);
    if (!this.attachment || !this.url) return;

    this.attachmentService.upload(this.attachment, this.url).subscribe((response: HttpEvent<Object>) => {
      console.log('Upload response received:', response);

      if (response.type === HttpEventType.Response) {
        this.attachment.uploading = false;
        if (response.status === 200) {
          console.log('Upload successful');
          this.upload.emit({
            id: this.attachment.id,
            response: response as HttpResponseBase, // Handle generic HttpEvent here
          });
          alert(`File uploaded successfully: ${this.attachment.name}`);
        } else {
          console.error('Upload failed with status:', response.status);
          this.error.emit({ id: this.attachment.id });
          alert(`File upload failed: ${this.attachment.name}`);
        }
      } else if (response.type === HttpEventType.UploadProgress) {
        this.attachment.uploading = true;
        if (response.total) {
          this.attachment.uploadProgress = Math.round(100 * response.loaded / response.total);
          console.log(`Upload progress: ${this.attachment.uploadProgress}%`);
        } else {
          console.warn('Upload progress total is not available');
          this.attachment.uploadProgress = 0;
        }
      }
    }, (err) => {
      console.error('Upload error:', err);
      this.error.emit({ id: this.attachment.id });
      alert(`Upload failed due to error: ${err.message}`);
    });
  }
}