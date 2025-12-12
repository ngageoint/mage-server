import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AuthorizationComponent } from './authorization.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatFormFieldModule } from '@angular/material/form-field';

describe('Authorization Component', () => {
  let component: AuthorizationComponent;
  let fixture: ComponentFixture<AuthorizationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AuthorizationComponent],
      imports: [HttpClientTestingModule, MatFormFieldModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthorizationComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
