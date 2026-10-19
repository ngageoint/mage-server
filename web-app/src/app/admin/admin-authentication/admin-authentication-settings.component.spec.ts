import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';

import { AdminAuthenticationSettingsComponent } from './admin-authentication-settings.component';

describe('AdminAuthenticationSettingsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAuthenticationSettingsComponent],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
  });

  it('should save new user default teams by team id', async () => {
    const fixture = TestBed.createComponent(AdminAuthenticationSettingsComponent);
    const strategy: any = {
      type: 'oauth',
      settings: {
        usersReqAdmin: { enabled: false },
        devicesReqAdmin: { enabled: true },
        newUserEvents: [],
        newUserTeams: []
      }
    };
    fixture.componentRef.setInput('strategy', strategy);
    fixture.componentRef.setInput('teams', [{ id: 'team-1', name: 'Team One' }, { id: 'team-2', name: 'Team Two' }]);
    await fixture.whenStable();

    const selects = await TestbedHarnessEnvironment.loader(fixture).getAllHarnesses(MatSelectHarness);
    const teamSelect = selects[2];
    await teamSelect.open();
    await teamSelect.clickOptions({ text: 'Team Two' });

    expect(strategy.settings.newUserTeams).toEqual(['team-2']);
  });

  describe('login button', () => {
    function strategyOfType(type: string): any {
      return {
        type,
        title: 'Keycloak',
        textColor: '#FFFFFF',
        buttonColor: '#1E88E5',
        settings: {
          usersReqAdmin: { enabled: true },
          devicesReqAdmin: { enabled: true }
        }
      };
    }

    it('should let admins edit the button for a third-party authentication', async () => {
      const fixture = TestBed.createComponent(AdminAuthenticationSettingsComponent);
      fixture.componentRef.setInput('strategy', strategyOfType('oauth'));
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('button-preview')).not.toBeNull();
    });

    it('should show the preview button for display only', async () => {
      const fixture = TestBed.createComponent(AdminAuthenticationSettingsComponent);
      fixture.componentRef.setInput('strategy', strategyOfType('oauth'));
      await fixture.whenStable();

      const previewButton: HTMLButtonElement = fixture.nativeElement.querySelector('.preview authentication-button button');
      previewButton.focus();
      expect(document.activeElement).not.toBe(previewButton);

      const buttonTextInput: HTMLInputElement = fixture.nativeElement.querySelector('.button-fields input');
      buttonTextInput.focus();
      expect(document.activeElement).toBe(buttonTextInput);
    });

    it('should not show a button for local authentication', async () => {
      const fixture = TestBed.createComponent(AdminAuthenticationSettingsComponent);
      const strategy = strategyOfType('local');
      strategy.settings.accountLock = { enabled: false };
      strategy.settings.passwordPolicy = {};
      fixture.componentRef.setInput('strategy', strategy);
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('button-preview')).toBeNull();
    });

    it('should mark the authentication changed when the button text is edited', async () => {
      const fixture = TestBed.createComponent(AdminAuthenticationSettingsComponent);
      const strategy = strategyOfType('oauth');
      fixture.componentRef.setInput('strategy', strategy);
      const dirty: boolean[] = [];
      fixture.componentInstance.strategyDirty.subscribe(isDirty => dirty.push(isDirty));
      await fixture.whenStable();

      const input: HTMLInputElement = fixture.nativeElement.querySelector('button-preview input');
      input.value = 'Continue to sign in';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      expect(strategy.buttonText).toBe('Continue to sign in');
      expect(strategy.isDirty).toBeTrue();
      expect(dirty).toEqual([true]);
      expect(fixture.nativeElement.querySelector('.authentication-button__text').textContent.trim()).toBe('Continue to sign in');
    });

    it('should let admins type a button color and mark the authentication changed', async () => {
      const fixture = TestBed.createComponent(AdminAuthenticationSettingsComponent);
      const strategy = strategyOfType('oauth');
      fixture.componentRef.setInput('strategy', strategy);
      await fixture.whenStable();

      const colorText: HTMLInputElement = fixture.nativeElement.querySelectorAll('.swatch-field__control input')[1];
      colorText.value = '#005CBB';
      colorText.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      expect(strategy.buttonColor).toBe('#005CBB');
      expect(strategy.isDirty).toBeTrue();
      const swatch: HTMLInputElement = fixture.nativeElement.querySelectorAll('input[type="color"]')[1];
      expect(swatch.value).toBe('#005cbb');
    });

    it('should show colors saved with opacity in the color swatch', async () => {
      const fixture = TestBed.createComponent(AdminAuthenticationSettingsComponent);
      const strategy = strategyOfType('oauth');
      strategy.buttonColor = '#1e88e5ff';
      fixture.componentRef.setInput('strategy', strategy);
      await fixture.whenStable();

      const swatch: HTMLInputElement = fixture.nativeElement.querySelectorAll('input[type="color"]')[1];
      expect(swatch.value).toBe('#1e88e5');
    });
  });
});
