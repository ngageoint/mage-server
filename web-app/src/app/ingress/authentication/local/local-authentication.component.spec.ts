import { TestBed, waitForAsync } from '@angular/core/testing';
import { LocalAuthenticationComponent } from './local-authentication.component';

describe('Local Authentication Component', () => {
  let component: LocalAuthenticationComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LocalAuthenticationComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
