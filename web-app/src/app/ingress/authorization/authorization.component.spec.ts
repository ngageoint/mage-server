import { TestBed, waitForAsync } from '@angular/core/testing';
import { AuthorizationComponent } from './authorization.component';

describe('Authorization Component', () => {
  let component: AuthorizationComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AuthorizationComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
