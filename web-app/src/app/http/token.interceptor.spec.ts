import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog as MatDialog, MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { of } from 'rxjs';
import { TokenInterceptorService, SUPPRESS_AUTH_DIALOG } from './token.interceptor';
import { SessionService } from './session.service';

describe('Token Interceptor Service', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let dialog: jasmine.SpyObj<MatDialog>;
  let sessionService: jasmine.SpyObj<SessionService>;

  beforeEach(() => {
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);

    sessionService = jasmine.createSpyObj('SessionService', ['getToken', 'clearSession']);
    sessionService.getToken.and.returnValue(null);

    TestBed.configureTestingModule({
      imports: [MatDialogModule],
      providers: [
        TokenInterceptorService,
        { provide: MatDialog, useValue: dialog },
        { provide: SessionService, useValue: sessionService },
        { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptorService, multi: true },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    const service: TokenInterceptorService = TestBed.inject(TokenInterceptorService);
    expect(service).toBeTruthy();
  });

  it('opens the re-auth dialog on a 401 by default', () => {
    httpClient.get('/api/users/myself').subscribe({
      next: () => {},
      error: () => {}
    });

    const req = httpMock.expectOne('/api/users/myself');
    req.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(sessionService.clearSession).toHaveBeenCalled();
    expect(dialog.open).toHaveBeenCalled();

    // afterClosed() resolves synchronously in this mock, so the interceptor
    // immediately retries the original request once the dialog "closes"
    const retryReq = httpMock.expectOne('/api/users/myself');
    retryReq.flush({});
  });

  it('does not open the re-auth dialog on a 401 when SUPPRESS_AUTH_DIALOG is set', () => {
    let caughtError: unknown;

    httpClient.get('/api/users/myself', {
      context: new HttpContext().set(SUPPRESS_AUTH_DIALOG, true)
    }).subscribe({
      error: (err) => { caughtError = err; }
    });

    const req = httpMock.expectOne('/api/users/myself');
    req.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(sessionService.clearSession).toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(caughtError).toBeTruthy();
  });
});
