import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AuthenticationButtonComponent } from './authentication-button.component';

describe('Authentication Button Component', () => {
  let component: AuthenticationButtonComponent;
  let fixture: ComponentFixture<AuthenticationButtonComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AuthenticationButtonComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthenticationButtonComponent);
    component = fixture.componentInstance;
  });

  function buttonText(): string {
    return fixture.nativeElement.querySelector('.authentication-button__text').textContent.trim();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show "Sign in with <title>" by default', () => {
    fixture.componentRef.setInput('text', 'Keycloak');
    fixture.detectChanges();

    expect(buttonText()).toBe('Sign in with Keycloak');
  });

  it('should show the custom button text when set', () => {
    fixture.componentRef.setInput('text', 'Keycloak');
    fixture.componentRef.setInput('buttonText', 'Continue to sign in');
    fixture.detectChanges();

    expect(buttonText()).toBe('Continue to sign in');
  });

  it('should show "Sign in with <title>" when the button text is blank', () => {
    fixture.componentRef.setInput('text', 'Keycloak');
    fixture.componentRef.setInput('buttonText', '   ');
    fixture.detectChanges();

    expect(buttonText()).toBe('Sign in with Keycloak');
  });

  it('should trim the custom button text', () => {
    fixture.componentRef.setInput('text', 'Keycloak');
    fixture.componentRef.setInput('buttonText', '  Continue to sign in  ');
    fixture.detectChanges();

    expect(buttonText()).toBe('Continue to sign in');
  });

  it('should apply the button and text colors', () => {
    fixture.componentRef.setInput('color', 'rgb(0, 92, 187)');
    fixture.componentRef.setInput('textColor', 'rgb(255, 255, 255)');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button').style.backgroundColor).toBe('rgb(0, 92, 187)');
    expect(fixture.nativeElement.querySelector('.authentication-button__text').style.color).toBe('rgb(255, 255, 255)');
  });

  it('should only show the icon when one is set', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();

    fixture.componentRef.setInput('icon', 'iVBORw0KGgo=');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(fixture.nativeElement.querySelector('.spacer')).not.toBeNull();
  });

  it('should emit authenticate on click', () => {
    spyOn(component.authenticate, 'emit');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();

    expect(component.authenticate.emit).toHaveBeenCalled();
  });
});
