import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AuthenticationButtonComponent } from './authentication-button.component';

describe('Authentication Button Component', () => {
  let component: AuthenticationButtonComponent;
  let fixture: ComponentFixture<AuthenticationButtonComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AuthenticationButtonComponent],
      imports: []
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthenticationButtonComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit authenticate on click', () => {
    spyOn(component.authenticate, 'emit');

    component.onClick();

    expect(component.authenticate.emit).toHaveBeenCalled();
  });
});
