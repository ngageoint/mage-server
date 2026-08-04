import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { AuthenticationComponent } from './authentication.component';

describe('AuthenticationComponent', () => {
  let component: AuthenticationComponent;
  let fixture: ComponentFixture<AuthenticationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AuthenticationComponent],
      imports: []
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthenticationComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit authenticated on signin', () => {
    spyOn(component.authenticated, 'emit');
    const event = { user: {} as any, token: 'abc' };

    component.onSignin(event);

    expect(component.authenticated.emit).toHaveBeenCalledWith(event);
  });

  it('should emit created on signup completion', () => {
    spyOn(component.created, 'emit');
    const event = { reason: 'signup' as const, user: {} as any };

    component.onCreated(event);

    expect(component.created.emit).toHaveBeenCalledWith(event);
  });

  it('should emit signup', () => {
    spyOn(component.signup, 'emit');

    component.onSignup();

    expect(component.signup.emit).toHaveBeenCalled();
  });

  it('should separate the local strategy from third-party strategies', () => {
    component.ngOnChanges({
      api: new SimpleChange(undefined, {
        authenticationStrategies: {
          local: { title: 'Local' },
          oauth: { title: 'OAuth', type: 'oauth' }
        }
      } as any, true)
    });

    expect(component.localAuthenticationStrategy.name).toBe('local');
    expect(component.thirdPartyStrategies.length).toBe(1);
    expect(component.thirdPartyStrategies[0].name).toBe('oauth');
  });
});
