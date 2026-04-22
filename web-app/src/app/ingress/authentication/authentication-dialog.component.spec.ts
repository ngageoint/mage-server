import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AuthenticationDialogComponent } from './authentication-dialog.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogRef as MatDialogRef } from '@angular/material/dialog';
import { IngressModule } from '../ingress.module';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Authentication Dialog', () => {
  let component: AuthenticationDialogComponent;
  let fixture: ComponentFixture<AuthenticationDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [AuthenticationDialogComponent],
    imports: [IngressModule],
    providers: [{
            provide: MatDialogRef,
            useValue: {}
        }, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(),]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthenticationDialogComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});