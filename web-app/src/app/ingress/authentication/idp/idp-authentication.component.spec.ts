import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IdpAuthenticationComponent } from './idp-authentication.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Idp Authentication Component', () => {
  let component: IdpAuthenticationComponent;
  let fixture: ComponentFixture<IdpAuthenticationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [IdpAuthenticationComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IdpAuthenticationComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
