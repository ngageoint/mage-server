import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  waitForAsync
} from '@angular/core/testing';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PageOf } from '@ngageoint/mage.web-core-lib/paging'
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { of } from 'rxjs';

import { TeamDashboardComponent } from './team-dashboard.component';
import { CreateTeamDialogComponent } from '../create-team/create-team.component';
import { PageEvent as PageEvent } from '@angular/material/paginator';
import { SessionService } from 'mage-web-app/http/session.service';
import { AdminToastService } from '../../services/admin-toast.service';

describe('TeamDashboardComponent', () => {
  let component: TeamDashboardComponent;
  let fixture: ComponentFixture<TeamDashboardComponent>;
  let mockTeamsService: jasmine.SpyObj<TeamService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSessionService: any;
  let toastSpy: jasmine.SpyObj<AdminToastService>;

  const mockTeams: Team[] = [
    {
      id: '1',
      name: 'Team Alpha',
      description: 'First team description',
      teamEventId: 10,
      userIds: [],
      acl: {}
    },
    {
      id: '2',
      name: 'Team Beta',
      description:
        'Second team description with much longer text that might wrap',
      teamEventId: 20,
      userIds: [],
      acl: {}
    },
    {
      id: '3',
      name: 'Team Gamma',
      description: 'Third team',
      teamEventId: 30,
      userIds: [],
      acl: {}
    }
  ];

  const mockTeamsResponse: PageOf<Team> = {
    items: mockTeams,
    totalCount: mockTeams.length,
    pageIndex: 0,
    pageSize: 10
  }

  beforeEach(waitForAsync(() => {
    mockTeamsService = jasmine.createSpyObj('AdminTeamsService', ['search']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    toastSpy = jasmine.createSpyObj('AdminToastService', ['show']);

    mockSessionService = {
      hasPermission: jasmine.createSpy('hasPermission').and.returnValue(true)
    };

    TestBed.configureTestingModule({
      declarations: [TeamDashboardComponent],
      imports: [NoopAnimationsModule],
      providers: [
        { provide: TeamService, useValue: mockTeamsService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: SessionService, useValue: mockSessionService },
        { provide: AdminToastService, useValue: toastSpy }
      ]
    })
      .overrideTemplate(TeamDashboardComponent, '')
      .compileComponents();
  }));

  beforeEach(() => {
    mockTeamsService.search.and.returnValue(of(mockTeamsResponse));

    fixture = TestBed.createComponent(TeamDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.searchTerm).toBe('');
    expect(component.pageSize).toBe(10);
    expect(component.pageIndex).toBe(0);
  });

  it('should fetch teams on init', () => {
    fixture.detectChanges();

    expect(mockTeamsService.search).toHaveBeenCalledWith({
      term: '',
      pageSize: 10,
      pageIndex: 0,
      omitEventTeams: true,
    });
    expect(component.teams).toEqual(mockTeams);
    expect(component.totalTeams).toBe(mockTeams.length);
    expect(component.teams).toEqual(mockTeams);
  });

  it('should reset page index when searching', () => {
    fixture.detectChanges();
    component.pageIndex = 2;

    component.onSearchTermChanged('test');

    expect(component.pageIndex).toBe(0);
    expect(mockTeamsService.search).toHaveBeenCalledWith({
      term: 'test',
      pageSize: 10,
      pageIndex: 0,
      omitEventTeams: true,
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
    expect(mockTeamsService.search).toHaveBeenCalledWith({
      term: '',
      pageSize: 25,
      pageIndex: 1,
      omitEventTeams: true,
    });
  });

  it('should reset search and pagination', () => {
    component.searchTerm = 'test';
    component.pageIndex = 2;

    component.onSearchCleared();

    expect(component.searchTerm).toBe('');
    expect(component.pageIndex).toBe(0);
    expect(mockTeamsService.search).toHaveBeenCalledWith({
      term: '',
      pageSize: 10,
      pageIndex: 0,
      omitEventTeams: true,
    });
  });

  it('should open new team dialog', () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(null));
    mockDialog.open.and.returnValue(dialogRefSpy);

    component.createTeam();

    expect(mockDialog.open).toHaveBeenCalledWith(CreateTeamDialogComponent, {
      width: '40vw',
      maxWidth: '40vw',
      disableClose: true,
      data: { team: {} }
    });
  });

  it('should refresh teams after creating new team', fakeAsync(() => {
    mockTeamsService.search.calls.reset();
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
      width: '40vw',
      maxWidth: '40vw',
      disableClose: true,
      data: { team: {} }
    });

    expect(toastSpy.show).toHaveBeenCalledWith(
      'Team created successfully',
      ['../teams', createdTeam.id],
      'View Team'
    );

    expect(mockTeamsService.search).toHaveBeenCalled();
  }));

  it('should not refresh teams if dialog is cancelled', fakeAsync(() => {
    mockTeamsService.search.calls.reset();

    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(null));
    mockDialog.open.and.returnValue(dialogRefSpy);

    component.createTeam();
    tick();

    expect(toastSpy.show).not.toHaveBeenCalled();
    expect(mockTeamsService.search).not.toHaveBeenCalled();
  }));

  it('should handle empty teams response by leaving defaults unchanged', () => {
    mockTeamsService.search.and.returnValue(of({ pageSize: 10, pageIndex: 0, totalCount: 0, items: []}));

    fixture.detectChanges();

    expect(component.teams).toEqual([]);
    expect(component.totalTeams).toBe(0);
    expect(component.teams).toEqual([]);
  });

  it('should cleanup subscriptions on destroy', () => {
    const destroy$ = (component as any).destroy$;
    const nextSpy = spyOn(destroy$, 'next').and.callThrough();
    const completeSpy = spyOn(destroy$, 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

});
