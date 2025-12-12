import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { LocalAuthenticationComponent } from './local-authentication.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('Local Authentication Component', () => {
  let component: LocalAuthenticationComponent;
  let fixture: ComponentFixture<LocalAuthenticationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LocalAuthenticationComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LocalAuthenticationComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
