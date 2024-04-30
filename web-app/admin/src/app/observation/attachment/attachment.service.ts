import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { share } from 'rxjs/operators';
import { FileUpload } from './attachment-upload/attachment-upload.component';

export enum AttachmentUploadStatus {
  COMPLETE,
  ERROR
}

export interface AttachmentUploadEvent {
  upload: FileUpload
  status: AttachmentUploadStatus
  response?: any
  observation?: any
}

@Injectable({
  providedIn: 'root'
})
export class AttachmentService {
  private uploadSource = new Subject<AttachmentUploadEvent>()

  upload$ = this.uploadSource.asObservable()

  constructor(private httpClient: HttpClient) { }

  upload(upload: FileUpload, observationUrl: string): Observable<HttpEvent<Object>> {
    const formData = new FormData();
    formData.append('attachment', upload.file);

    const url = `${observationUrl}/attachments/${upload.attachmentId}`
    const observable = this.httpClient.put(url, formData, { observe: 'events', reportProgress: true }).pipe(share())

    observable.subscribe((response: HttpEvent<HttpResponse<Object>>) => {
      if (response.type === HttpEventType.Response) {
        if (response.status === 200) {
          this.uploadSource.next({
            upload: upload,
            response: response.body,
            status: AttachmentUploadStatus.COMPLETE
          })
        }
      }
    }, (error: HttpErrorResponse) => {
      this.uploadSource.next({
        upload: upload,
        response: error,
        status: AttachmentUploadStatus.ERROR
      })
    })

    return observable
  }
}
