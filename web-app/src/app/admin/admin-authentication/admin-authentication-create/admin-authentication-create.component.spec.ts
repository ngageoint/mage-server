import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthenticationCreateComponent } from './admin-authentication-create.component';
import { AuthenticationConfigurationService } from '../../services/admin-authentication-configuration.service';

describe('AuthenticationCreateComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthenticationCreateComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthenticationConfigurationService,
          useValue: { getAllConfigurations: () => of({ data: [{ name: 'ldap' }, { name: 'local' }] }) }
        },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
      ]
    }).compileComponents();
  });

  it('should only offer authentication types that are not already configured without zone.js', async () => {
    const fixture = TestBed.createComponent(AuthenticationCreateComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const typeSelect = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectHarness);
    await typeSelect.open();
    const options = await typeSelect.getOptions();
    const labels = await Promise.all(options.map((option) => option.getText()));

    expect(labels).toEqual(['OpenID Connect', 'OAuth2', 'SAML']);
  });

  it('should default the button text from the title until the admin changes it', async () => {
    const fixture = TestBed.createComponent(AuthenticationCreateComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    component.titleCtrl.setValue('Keycloak');
    expect(component.strategy.buttonText).toBe('Sign in with Keycloak');

    component.titleCtrl.setValue('Keycloak SSO');
    expect(component.strategy.buttonText).toBe('Sign in with Keycloak SSO');

    component.strategy.buttonText = 'Continue to sign in';
    component.titleCtrl.setValue('Keycloak');
    expect(component.strategy.buttonText).toBe('Continue to sign in');
  });

  it('should require button text', async () => {
    const fixture = TestBed.createComponent(AuthenticationCreateComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    component.titleCtrl.setValue('Keycloak');
    expect(component.isLoginButtonValid()).toBeTrue();

    component.strategy.buttonText = '   ';
    expect(component.isLoginButtonValid()).toBeFalse();
    expect(component.isValid()).toBeFalse();
  });

  it('should require hex button colors', async () => {
    const fixture = TestBed.createComponent(AuthenticationCreateComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    component.titleCtrl.setValue('Keycloak');
    component.strategy.buttonColor = '#005cbbff';
    expect(component.isLoginButtonValid()).toBeTrue();

    component.strategy.buttonColor = '';
    expect(component.isLoginButtonValid()).toBeTrue();

    component.strategy.buttonColor = '#12';
    expect(component.isLoginButtonValid()).toBeFalse();

    component.strategy.buttonColor = '#005CBB';
    component.strategy.textColor = 'white';
    expect(component.isLoginButtonValid()).toBeFalse();
  });
});
