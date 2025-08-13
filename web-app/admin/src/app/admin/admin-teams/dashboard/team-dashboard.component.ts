import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Team } from '../team';
import { Subject } from 'rxjs';
import { TeamsService } from '../teams-service';
import { CreateTeamDialogComponent } from '../create-team/create-team.component';
import { CardActionButton } from '../../../core/card-navbar/card-navbar.component';

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

  dataSource = new MatTableDataSource<Team>();
  displayedColumns = ['name', 'description'];

  actionButtons: CardActionButton[] = [{ label: 'New Team', type: 'primary', action: () => this.newTeam() }];

  private destroy$ = new Subject<void>();

  constructor(
    private modal: MatDialog,
    private teamService: TeamsService
  ) { }

  /**
   * Fetches the initial set of teams when the component loads
   */
  ngOnInit(): void {
    this.fetchTeams();
  }

  /**
   * Component destruction lifecycle hook
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetches teams from the service based on current search term and pagination settings
   */
  fetchTeams(): void {
    this.teamService.getTeams({
      term: this.teamSearch,
      sort: { name: 1 },
      limit: this.pageSize,
      omit_event_teams: true,
      start: String(this.pageIndex * this.pageSize)
    }).subscribe((results) => {
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
  newTeam(): void {
    const dialogRef = this.modal.open(CreateTeamDialogComponent, {
      width: '50rem',
      height: '25rem',
      data: { team: {} }
    });

    dialogRef.afterClosed().subscribe(newTeam => {
      if (newTeam) {
        this.fetchTeams();
      }
    });
  }

  /**
   * Navigates to the detailed view of a specific team
   * 
   * @param team - The team to navigate to
   */
  gotoTeam(team: Team): void {
    // TODO: convert to this to using a router once upgrade is complete
    const baseUrl = window.location.href.split('#')[0];
    window.location.href = `${baseUrl}#/home/teams/${team.id}`;
  }
}
