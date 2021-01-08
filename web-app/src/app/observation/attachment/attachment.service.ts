import { HttpClient, HttpEvent, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AttachmentService {

  constructor(private httpClient: HttpClient) { }

  upload(file: File, url: string,): Observable<HttpEvent<HttpResponse<Object>>> {
    const formData = new FormData();
    formData.append('attachment', file);
    
    return this.httpClient.post<HttpResponse<Object>>(url, formData, { observe: 'events' })
  }
}
