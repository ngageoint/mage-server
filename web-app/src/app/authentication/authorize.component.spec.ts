import { TestBed, waitForAsync } from '@angular/core/testing';
import { AuthorizeComponent } from './authorize.component';

describe('AuthorizeComponent', () => {
  let component: AuthorizeComponent;

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
