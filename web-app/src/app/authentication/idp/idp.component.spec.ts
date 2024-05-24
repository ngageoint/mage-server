import { TestBed, waitForAsync } from '@angular/core/testing';
import { IdpAuthenticationComponent } from './idp.component';

describe('Idp Authentication Component', () => {
  let component: IdpAuthenticationComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [IdpAuthenticationComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
