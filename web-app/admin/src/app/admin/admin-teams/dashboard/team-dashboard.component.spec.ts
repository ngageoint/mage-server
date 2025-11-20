import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { TeamDashboardComponent } from './team-dashboard.component';
import { TeamsService } from '../teams-service';
import { Team } from '../team';
import { CreateTeamDialogComponent } from '../create-team/create-team.component';

describe('TeamDashboardComponent', () => {
  let component: TeamDashboardComponent;
  let fixture: ComponentFixture<TeamDashboardComponent>;
  let mockTeamsService: jasmine.SpyObj<TeamsService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockTeams: Team[] = [
    { id: '1', name: 'Team Alpha', description: 'First team description', teamEventId: '507f1f77bcf86cd799439011', users: [] as any, acl: {} as any },
    { id: '2', name: 'Team Beta', description: 'Second team description with much longer text that might wrap', teamEventId: '507f191e810c19729de860ea', users: [] as any, acl: {} as any },
    { id: '3', name: 'Team Gamma', description: 'Third team', teamEventId: '507f1f77bcf86cd799439012', users: [] as any, acl: {} as any }
  ];

  const mockTeamsResponse = [{
    items: mockTeams,
    totalCount: mockTeams.length
  }];

  beforeEach(async () => {
    const teamsServiceSpy = jasmine.createSpyObj('TeamsService', ['getTeams']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [TeamDashboardComponent],
      imports: [
        MatTableModule,
        MatPaginatorModule,
        NoopAnimationsModule,
        FormsModule
      ],
      providers: [
        { provide: TeamsService, useValue: teamsServiceSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TeamDashboardComponent);
    component = fixture.componentInstance;
    mockTeamsService = TestBed.inject(TeamsService) as jasmine.SpyObj<TeamsService>;
    mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;

    mockTeamsService.getTeams.and.returnValue(of(mockTeamsResponse));
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
  });

  it('should reset page index when searching', fakeAsync(() => {
    fixture.detectChanges();
    component.pageIndex = 2;

    component.onSearchTermChanged('test');
    tick(250);

    expect(component.pageIndex).toBe(0);
  }));

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
      omit_event_teams: true,
      limit: 10,
      start: '0'
    });
  });

  it('should open new team dialog', () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(null));
    mockDialog.open.and.returnValue(dialogRefSpy);

    component.createTeam();

    expect(mockDialog.open).toHaveBeenCalledWith(CreateTeamDialogComponent, {
      data: { team: {} }
    });
  });

  it('should refresh teams after creating new team', () => {
    const createTeam = { id: '4', name: 'New Team', description: 'New team description' };
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(createTeam));
    mockDialog.open.and.returnValue(dialogRefSpy);

    component.createTeam();

    expect(mockTeamsService.getTeams).toHaveBeenCalled();
  });

  it('should not refresh teams if dialog is cancelled', () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(null));
    mockDialog.open.and.returnValue(dialogRefSpy);

    component.createTeam();

    expect(mockTeamsService.getTeams).not.toHaveBeenCalled();
  });

  it('should handle empty teams response', () => {
    mockTeamsService.getTeams.and.returnValue(of([]));

    fixture.detectChanges();

    expect(component.teams).toEqual([]);
    expect(component.totalTeams).toBe(0);
    expect(component.dataSource.data).toEqual([]);
  });

  it('should display team names and descriptions in table', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const tableRows = compiled.querySelectorAll('tr.mat-row');

    expect(tableRows.length).toBe(mockTeams.length);
    expect(compiled.textContent).toContain('Team Alpha');
    expect(compiled.textContent).toContain('First team description');
  });

  it('should show table headers', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const headers = compiled.querySelectorAll('th.mat-header-cell');
    expect(headers.length).toBe(1);
    expect(headers[0].textContent).toContain('Name');
  });

  it('should cleanup subscriptions on destroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
