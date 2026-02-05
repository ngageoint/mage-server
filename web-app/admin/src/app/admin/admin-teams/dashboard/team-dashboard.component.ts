import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Team } from '../team';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { CreateTeamDialogComponent } from '../create-team/create-team.component';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminToastService } from '../../services/admin-toast.service';

/**
 * Team dashboard component that displays a paginated list of teams with search functionality.
 * Provides capabilities to view, search, and create new teams through a data table interface.
 */
@Component({
  selector: 'mage-admin-teams',
  templateUrl: './team-dashboard.component.html',
  styleUrls: ['./team-dashboard.component.scss']
})
export class TeamDashboardComponent implements OnInit, OnDestroy {
  teamSearch = '';
  teams: Team[] = [];
  totalTeams = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25];

  numChars = 180;
  toolTipWidth = '1000px';

  dataSource = new MatTableDataSource<Team>();
  displayedColumns = ['name'];

  breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Teams',
      iconClass: 'fa fa-users'
    }
  ];

  hasTeamCreatePermission = false;

  private destroy$ = new Subject<void>();

  constructor(
    private modal: MatDialog,
    private teamService: AdminTeamsService,
    private userService: AdminUserService,
    private toastService: AdminToastService
  ) {}

  /**
   * Fetches the initial set of teams when the component loads
   */
  ngOnInit(): void {
    this.initPermissions();
    this.fetchTeams();
    this.updateResponsiveLayout();
  }

  /**
   * Component destruction lifecycle hook
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initPermissions(): void {
    this.userService.myself$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        const permissions = user?.role?.permissions ?? [];
        this.hasTeamCreatePermission = permissions.includes('CREATE_TEAM');
      });
  }

  /**
   * Fetches teams from the service based on current search term and pagination settings
   */
  fetchTeams(): void {
    this.teamService
      .getTeams({
        term: this.teamSearch,
        sort: { name: 1 },
        limit: this.pageSize,
        omit_event_teams: true,
        start: String(this.pageIndex * this.pageSize)
      })
      .subscribe((results) => {
        if (results?.length > 0) {
          const teams = results[0];
          this.teams = teams.items;
          this.totalTeams = teams.totalCount;
          this.dataSource.data = this.teams;
        }
      });
  }

  /**
   * Handles pagination change events from the Material paginator
   *
   * @param event - The page event containing new page size and index
   */
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.fetchTeams();
  }

  /**
   * Resets pagination to the first page and refetches teams with the new search term
   *
   * @param term - The new search term entered by the user
   */
  onSearchTermChanged(term: string): void {
    this.teamSearch = term;
    this.pageIndex = 0; // Reset to first page when searching
    this.fetchTeams();
  }

  /**
   * Resets the search term, pagination to the first page, and refetches all teams
   */
  onSearchCleared(): void {
    this.teamSearch = '';
    this.pageIndex = 0;
    this.fetchTeams();
  }

  /**
   * Opens the create team dialog and handles the result.
   * If a new team is created, refetches the teams list to include the new team.
   */
  createTeam(): void {
    if (!this.hasTeamCreatePermission) return;

    const dialogRef = this.modal.open(CreateTeamDialogComponent, {
      width: '600px',
      data: { team: {} }
    });

    dialogRef.afterClosed().subscribe((newTeam: Team) => {
      if (newTeam) {
        this.toastService.show(
          'Team Created',
          ['../teams', newTeam.id],
          'Go to Team'
        );
        this.fetchTeams();
      }
    });
  }

  /** Update layout-related values on resize */
  @HostListener('window:resize')
  onResize(): void {
    this.updateResponsiveLayout();
  }

  /** Calculates responsive values */
  private updateResponsiveLayout(): void {
    this.numChars = Math.ceil(window.innerWidth / 8.5);
    this.toolTipWidth = `${window.innerWidth * 0.75}px`;
  }
}
