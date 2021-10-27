import { HttpEvent, HttpEventType, HttpResponse, HttpResponseBase } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AttachmentAction } from '../../observation-edit/observation-edit-attachment/observation-edit-attachment-action';
import { AttachmentService } from '../attachment.service';

export interface FileUpload {
  id: number | string,
  name: string,
  formControl: FormControl,
  attachmentId: string,
  action: AttachmentAction,
  file: File,
  preview?: string,
  uploading?: boolean,
  uploadProgress?: number
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
  @Input() attachment: FileUpload
  @Input() url: string

  @Output() remove = new EventEmitter<{ id: number | string }>()
  @Output() upload = new EventEmitter<{ id: number | string, response: HttpResponseBase }>()
  @Output() error = new EventEmitter<{ id: number | string }>()

  preview: PreviewType = PreviewType.LOADING
  previewType = PreviewType
  attachmentsToUpload = 0
  actions: typeof AttachmentAction = AttachmentAction

  constructor(private changeDetector: ChangeDetectorRef, private attachmentService: AttachmentService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.attachment && this.attachment) {
      if (this.attachment.file.type.match('image')) {
        this.preview = PreviewType.LOADING
        this.previewImage(this.attachment)
          .then(() => { this.preview = PreviewType.IMAGE })
          .catch(() => this.preview = PreviewType.UNKNOWN)
      } else if (this.attachment.file.type.match('video')) {
        this.preview = PreviewType.LOADING
        this.previewVideo(this.attachment)
          .then(() => { this.preview = PreviewType.VIDEO })
          .catch(() => this.preview = PreviewType.UNKNOWN)
      } else if (this.attachment.file.type.match('audio')) {
        this.preview = PreviewType.AUDIO
      } else {
        this.preview = PreviewType.UNKNOWN
      }
    }

    if (changes.url && changes.url.currentValue) {
      this.startUpload();
    }
  }

  removeAttachment(id: number): void {
    this.remove.emit({ id: id })
  }

  previewImage(info: FileUpload): Promise<void> {
    return new Promise(resolve => {
      const reader = new FileReader()

      reader.onload = (e: Event): void => {
        const target = e.target as FileReader;
        info.preview = target.result as string
        this.changeDetector.detectChanges()
        resolve()
      }

      reader.readAsDataURL(info.file)
    })
  }

  previewVideo(info: FileUpload): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (): void => {
        const blob = new Blob([reader.result], { type: info.file.type })
        const url = URL.createObjectURL(blob)
        const video: HTMLVideoElement = document.createElement('video')

        video.addEventListener('loadeddata', () => {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
          const image = canvas.toDataURL()
          info.preview = image
          URL.revokeObjectURL(url)
          this.changeDetector.detectChanges()
          resolve()
        })

        video.addEventListener('error', () => {
          this.changeDetector.detectChanges()
          reject()
        })

        video.preload = 'metadata'
        video.src = url
        video.muted = true
        video.play()
      }

      reader.readAsArrayBuffer(info.file)
    })
  }

  startUpload(): void {
    if (!this.attachment || !this.url) return

    this.attachmentService.upload(this.attachment, this.url).subscribe((response: HttpEvent<HttpResponse<Object>>) => {
      if (response.type === HttpEventType.Response) {
        this.attachment.uploading = false
        if (response.status === 200) {
          this.upload.emit({ id: this.attachment.id, response: response.body })
        } else {
          this.error.emit({ id: this.attachment.id })
        }
      } else if (response.type === HttpEventType.UploadProgress) {
        this.attachment.uploading = true
        this.attachment.uploadProgress = Math.round(100 * response.loaded / response.total);
      }
    })
  }
}
