import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AuthenticationDialogComponent } from './authentication-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { IngressModule } from '../ingress.module';

describe('Authentication Dialog', () => {
  let component: AuthenticationDialogComponent;
  let fixture: ComponentFixture<AuthenticationDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AuthenticationDialogComponent],
      imports: [HttpClientTestingModule, IngressModule],
      providers: [{
        provide: MatDialogRef,
        useValue: {}
      },]
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