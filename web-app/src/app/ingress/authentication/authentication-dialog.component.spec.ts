import { TestBed, waitForAsync } from '@angular/core/testing';
import { AuthorizeComponent } from '../../authentication/authorize.component';
import { AuthenticationDialogComponent } from './authentication-dialog.component';

describe('Authentication Dialog', () => {
  let component: AuthenticationDialogComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AuthorizeComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});