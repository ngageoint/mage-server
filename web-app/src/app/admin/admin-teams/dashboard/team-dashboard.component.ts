import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { PageEvent as PageEvent } from '@angular/material/paginator';
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CreateTeamDialogComponent } from '../create-team/create-team.component';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { AdminToastService } from '../../services/admin-toast.service';
import { SessionService } from 'mage-web-app/http/session.service';

/**
 * Team dashboard component that displays a paginated list of teams with search functionality.
 * Provides capabilities to view, search, and create new teams through a data table interface.
 */
@Component({
    selector: 'mage-admin-teams',
    templateUrl: './team-dashboard.component.html',
    styleUrls: ['./team-dashboard.component.scss'],
    standalone: false
})
export class TeamDashboardComponent implements OnInit, OnDestroy {
  searchTerm = '';
  teams: Team[] = [];
  totalTeams = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25];

  breadcrumbs: AdminBreadcrumb[] = [{ title: 'Teams', icon: 'groups' }];

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  get hasTeamCreatePermission(): boolean {
    return this.sessionService.hasPermission('CREATE_TEAM');
  }

  private destroy$ = new Subject<void>();

  constructor(
    private modal: MatDialog,
    private teamService: TeamService,
    private sessionService: SessionService,
    private toastService: AdminToastService,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  /**
   * Fetches the initial set of teams when the component loads
   */
  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);
    this.fetchTeams();
  }

  /**
   * Component destruction lifecycle hook
   */
  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetches teams from the service based on current search term and pagination settings
   */
  fetchTeams(): void {
    this.teamService
      .search({
        term: this.searchTerm,
        pageSize: this.pageSize,
        pageIndex: this.pageIndex,
        omitEventTeams: true,
      })
      .subscribe((page) => {
        this.teams = page.items;
        if (typeof page.totalCount === 'number') {
          this.totalTeams = page.totalCount
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
    this.searchTerm = term;
    this.totalTeams = 0;
    this.pageIndex = 0; // Reset to first page when searching
    this.fetchTeams();
  }

  /**
   * Resets the search term, pagination to the first page, and refetches all teams
   */
  onSearchCleared(): void {
    this.searchTerm = '';
    this.totalTeams = 0;
    this.pageIndex = 0;
    this.fetchTeams();
  }

  /**
   * Opens the create team dialog and handles the result.
   * If a new team is created, refetches the teams list to include the new team.
   */
  createTeam(): void {
    if (!this.hasTeamCreatePermission) {
      return;
    }
    this.modal.open(CreateTeamDialogComponent, {
      width: '40vw',
      maxWidth: '40vw',
      disableClose: true,
      data: { team: {} }
    }).afterClosed().pipe(takeUntil(this.destroy$)).subscribe((newTeam: Team) => {
      if (newTeam) {
        this.toastService.show(
          'Team created successfully',
          ['../teams', newTeam.id],
          'View Team'
        );
        this.fetchTeams();
      }
    });
  }

}
