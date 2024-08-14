import { TestBed, waitForAsync } from '@angular/core/testing';
import { AccountStatusComponent } from './account-status.component';

describe('Account Status Component', () => {
  let component: AccountStatusComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AccountStatusComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
