import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpRequest,
} from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';

type Buffered = {
  req: HttpRequest<any>;
  next: HttpHandler;
  subject: Subject<HttpEvent<any>>;
};

@Injectable({ providedIn: 'root' })
export class HttpRequestBufferService {
  private buffer: Buffered[] = [];

  bufferRequest(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const subject = new Subject<HttpEvent<any>>();
    this.buffer.push({ req, next, subject });
    return subject.asObservable();
  }

  retryAll(): void {
    const queued = [...this.buffer];
    this.buffer = [];

    queued.forEach(({ req, next, subject }) => {
      next.handle(req).subscribe({
        next: (event) => subject.next(event),
        error: (err) => subject.error(err),
        complete: () => subject.complete()
      });
    });
  }

  clear(): void {
    const queued = [...this.buffer];
    this.buffer = [];
    queued.forEach(({ subject }) => subject.error(new Error('Request buffer cleared')));
  }

  get size(): number {
    return this.buffer.length;
  }
}
