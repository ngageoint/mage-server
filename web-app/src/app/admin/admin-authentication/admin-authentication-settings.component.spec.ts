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
});
