import { HttpEvent, HttpEventType, HttpResponse, HttpResponseBase } from '@angular/common/http';
import { Component, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FilenamePipe } from '../../../filename/filename.pipe';
import { AttachmentAction } from '../../observation-edit/observation-edit-attachment/observation-edit-attachment-action';
import { AttachmentService } from '../attachment.service';

export interface FileUpload {
  id: number | string,
  name: string,
  formControl: UntypedFormControl,
  attachmentId: string,
  action: AttachmentAction,
  file: File,
  preview?: string
}

enum PreviewType {
  LOADING, IMAGE, VIDEO, AUDIO, UNKNOWN
}

@Component({
    selector: 'attachment-upload',
    templateUrl: './attachment-upload.component.html',
    styleUrls: ['./attachment-upload.component.scss'],
    imports: [MatButtonModule, MatIconModule, MatProgressBarModule, MatProgressSpinnerModule, FilenamePipe]
})
export class AttachUploadComponent {
  private readonly attachmentService: AttachmentService = inject(AttachmentService)

  attachment = input<FileUpload>()
  url = input<string>()

  @Output() remove = new EventEmitter<{ id: number | string }>()
  @Output() upload = new EventEmitter<{ id: number | string, response: HttpResponseBase }>()
  @Output() error = new EventEmitter<{ id: number | string }>()

  preview = signal<PreviewType>(PreviewType.LOADING)
  previewType = PreviewType
  uploading = signal(false)
  uploadProgress = signal<number | null>(null)
  actions: typeof AttachmentAction = AttachmentAction

  constructor() {
    effect(() => {
      const attachment = this.attachment()
      if (!attachment) return

      if (attachment.file.type.match('image')) {
        this.preview.set(PreviewType.LOADING)
        this.previewImage(attachment)
          .then(() => { this.preview.set(PreviewType.IMAGE) })
          .catch(() => this.preview.set(PreviewType.UNKNOWN))
      } else if (attachment.file.type.match('video')) {
        this.preview.set(PreviewType.LOADING)
        this.previewVideo(attachment)
          .then(() => { this.preview.set(PreviewType.VIDEO) })
          .catch(() => this.preview.set(PreviewType.UNKNOWN))
      } else if (attachment.file.type.match('audio')) {
        this.preview.set(PreviewType.AUDIO)
      } else {
        this.preview.set(PreviewType.UNKNOWN)
      }
    })

    effect(() => {
      if (this.url()) {
        this.startUpload()
      }
    })
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
          resolve()
        })

        video.addEventListener('error', () => {
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
    const attachment = this.attachment()
    if (!attachment || !this.url()) return

    this.attachmentService.upload(attachment, this.url()).subscribe((response: HttpEvent<HttpResponse<Object>>) => {
      if (response.type === HttpEventType.Response) {
        this.uploading.set(false)
        if (response.status === 200) {
          this.upload.emit({ id: attachment.id, response: response.body })
        } else {
          this.error.emit({ id: attachment.id })
        }
      } else if (response.type === HttpEventType.UploadProgress) {
        this.uploading.set(true)
        this.uploadProgress.set(Math.round(100 * response.loaded / response.total))
      }
    })
  }
}
