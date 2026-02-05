import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  waitForAsync
} from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { TeamDashboardComponent } from './team-dashboard.component';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { Team } from '../team';
import { CreateTeamDialogComponent } from '../create-team/create-team.component';
import { PageEvent } from '@angular/material/paginator';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminToastService } from '../../services/admin-toast.service';

describe('TeamDashboardComponent', () => {
  let component: TeamDashboardComponent;
  let fixture: ComponentFixture<TeamDashboardComponent>;
  let mockTeamsService: jasmine.SpyObj<AdminTeamsService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockUserService: any;
  let toastSpy: jasmine.SpyObj<AdminToastService>;

  const mockTeams: Team[] = [
    {
      id: '1',
      name: 'Team Alpha',
      description: 'First team description',
      teamEventId: '507f1f77bcf86cd799439011',
      users: [] as any,
      acl: {} as any
    },
    {
      id: '2',
      name: 'Team Beta',
      description:
        'Second team description with much longer text that might wrap',
      teamEventId: '507f191e810c19729de860ea',
      users: [] as any,
      acl: {} as any
    },
    {
      id: '3',
      name: 'Team Gamma',
      description: 'Third team',
      teamEventId: '507f1f77bcf86cd799439012',
      users: [] as any,
      acl: {} as any
    }
  ];

  const mockTeamsResponse = [
    {
      items: mockTeams,
      totalCount: mockTeams.length
    }
  ];

  beforeEach(waitForAsync(() => {
    mockTeamsService = jasmine.createSpyObj('AdminTeamsService', ['getTeams']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    toastSpy = jasmine.createSpyObj('AdminToastService', ['show']);

    mockUserService = {
      myself$: of({ role: { permissions: ['CREATE_TEAM'] } })
    };

    TestBed.configureTestingModule({
      declarations: [TeamDashboardComponent],
      imports: [NoopAnimationsModule],
      providers: [
        { provide: AdminTeamsService, useValue: mockTeamsService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: AdminUserService, useValue: mockUserService },
        { provide: AdminToastService, useValue: toastSpy }
      ]
    })
      .overrideTemplate(TeamDashboardComponent, '')
      .compileComponents();
  }));

  beforeEach(() => {
    mockTeamsService.getTeams.and.returnValue(of(mockTeamsResponse));

    fixture = TestBed.createComponent(TeamDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.teamSearch).toBe('');
    expect(component.pageSize).toBe(10);
    expect(component.pageIndex).toBe(0);
    expect(component.displayedColumns).toEqual(['name']);
  });

  it('should fetch teams on init', () => {
    fixture.detectChanges();

    expect(mockTeamsService.getTeams).toHaveBeenCalledWith({
      term: '',
      sort: { name: 1 },
      limit: 10,
      omit_event_teams: true,
      start: '0'
    });
    expect(component.teams).toEqual(mockTeams);
    expect(component.totalTeams).toBe(mockTeams.length);
    expect(component.dataSource.data).toEqual(mockTeams);
    expect(component.numChars).toBeGreaterThan(0);
    expect(component.toolTipWidth).toContain('px');
  });

  it('should reset page index when searching', () => {
    fixture.detectChanges();
    component.pageIndex = 2;

    component.onSearchTermChanged('test');

    expect(component.pageIndex).toBe(0);
    expect(mockTeamsService.getTeams).toHaveBeenCalledWith({
      term: 'test',
      sort: { name: 1 },
      limit: 10,
      omit_event_teams: true,
      start: '0'
    });
  });

  it('should handle page changes', () => {
    const pageEvent: PageEvent = {
      pageIndex: 1,
      pageSize: 25,
      length: 100
    };

    component.onPageChange(pageEvent);

    expect(component.pageSize).toBe(25);
    expect(component.pageIndex).toBe(1);
    expect(mockTeamsService.getTeams).toHaveBeenCalledWith({
      term: '',
      sort: { name: 1 },
      limit: 25,
      omit_event_teams: true,
      start: '25'
    });
  });

  it('should reset search and pagination', () => {
    component.teamSearch = 'test';
    component.pageIndex = 2;

    component.onSearchCleared();

    expect(component.teamSearch).toBe('');
    expect(component.pageIndex).toBe(0);
    expect(mockTeamsService.getTeams).toHaveBeenCalledWith({
      term: '',
      sort: { name: 1 },
      limit: 10,
      omit_event_teams: true,
      start: '0'
    });
  });

  it('should open new team dialog', () => {
    component.hasTeamCreatePermission = true;

    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(null));
    mockDialog.open.and.returnValue(dialogRefSpy);

    component.createTeam();

    expect(mockDialog.open).toHaveBeenCalledWith(CreateTeamDialogComponent, {
      width: '600px',
      data: { team: {} }
    });
  });
  
  it('should refresh teams after creating new team', fakeAsync(() => {
    component.hasTeamCreatePermission = true;

    mockTeamsService.getTeams.calls.reset();
    toastSpy.show.calls.reset();

    const createdTeam = {
      id: '4',
      name: 'New Team',
      description: 'New team description'
    } as any;

    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(createdTeam));
    mockDialog.open.and.returnValue(dialogRefSpy);

    component.createTeam();
    tick();

    expect(mockDialog.open).toHaveBeenCalledWith(CreateTeamDialogComponent, {
      width: '600px',
      data: { team: {} }
    });

    expect(toastSpy.show).toHaveBeenCalledWith(
      'Team Created',
      ['../teams', createdTeam.id],
      'Go to Team'
    );

    expect(mockTeamsService.getTeams).toHaveBeenCalled();
  }));

  it('should not refresh teams if dialog is cancelled', fakeAsync(() => {
    mockTeamsService.getTeams.calls.reset();

    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(null));
    mockDialog.open.and.returnValue(dialogRefSpy);

    component.createTeam();
    tick();

    expect(toastSpy.show).not.toHaveBeenCalled();
    expect(mockTeamsService.getTeams).not.toHaveBeenCalled();
  }));

  it('should handle empty teams response by leaving defaults unchanged', () => {
    mockTeamsService.getTeams.and.returnValue(of([]));

    fixture.detectChanges();

    expect(component.teams).toEqual([]);
    expect(component.totalTeams).toBe(0);
    expect(component.dataSource.data).toEqual([]);
  });

  it('should cleanup subscriptions on destroy', () => {
    const destroy$ = (component as any).destroy$;
    const nextSpy = spyOn(destroy$, 'next').and.callThrough();
    const completeSpy = spyOn(destroy$, 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('should update layout values on resize', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000
    });

    component.onResize();

    expect(component.numChars).toBe(Math.ceil(1000 / 8.5));
    expect(component.toolTipWidth).toBe('750px');
  });
});
