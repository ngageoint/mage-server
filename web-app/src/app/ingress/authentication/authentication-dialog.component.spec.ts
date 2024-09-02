import { TestBed, waitForAsync } from '@angular/core/testing';
import { AuthenticationDialogComponent } from './authentication-dialog.component';

describe('Authentication Dialog', () => {
  let component: AuthenticationDialogComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AuthenticationDialogComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});