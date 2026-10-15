import { CUSTOM_ELEMENTS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { provideRouter } from '@angular/router';
import { TeamService } from '@ngageoint/mage.web-core-lib/team';
import { of } from 'rxjs';

import { AdminAuthenticationComponent } from './admin-authentication.component';
import { AuthenticationConfigurationService } from '../services/admin-authentication-configuration.service';
import { AdminEventsService } from '../services/admin-events.service';
import { SessionService } from 'mage-web-app/http/session.service';

describe('AdminAuthenticationComponent', () => {
  const makeConfigurations = () => ({
    data: [
      { _id: 'zulu', title: 'Zulu', type: 'oauth', enabled: true, settings: { newUserTeams: ['team-1', 'gone'], newUserEvents: [1, 99] } },
      { _id: 'alpha', title: 'Alpha', type: 'local', enabled: true, icon: 'abc123', settings: {} }
    ]
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAuthenticationComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthenticationConfigurationService, useValue: { getAllConfigurations: () => of(makeConfigurations()) } },
        { provide: TeamService, useValue: { search: () => of({ items: [{ id: 'team-1' }, { id: 'event-team', teamEventId: 5 }] }) } },
        { provide: AdminEventsService, useValue: { getEvents: () => of({ items: [{ id: 1 }] }) } },
        { provide: SessionService, useValue: { hasPermission: () => false } },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) }
      ]
    })
      .overrideComponent(AdminAuthenticationComponent, {
        set: { imports: [MatExpansionModule, MatIconModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
      })
      .compileComponents();
  });

  async function render(): Promise<ComponentFixture<AdminAuthenticationComponent>> {
    const fixture = TestBed.createComponent(AdminAuthenticationComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    return fixture;
  }

  it('should render the loaded strategies sorted by title without zone.js', async () => {
    const fixture = await render();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('mat-panel-title'))
      .map((title: any) => title.textContent.replace('security', '').trim());
    expect(titles).toEqual(['Alpha', 'Zulu']);
  });

  it('should drop non-event teams and stale new-user teams and events', async () => {
    const component = (await render()).componentInstance;

    expect(component.teams().map((team) => team.id)).toEqual(['team-1']);

    const zulu = component.strategies().find((strategy) => strategy.title === 'Zulu')!;
    expect(zulu.settings.newUserTeams).toEqual(['team-1']);
    expect(zulu.settings.newUserEvents).toEqual([1]);

    const alpha = component.strategies().find((strategy) => strategy.title === 'Alpha')!;
    expect(alpha.icon).toBe('data:image/png;base64,abc123');
  });
});
