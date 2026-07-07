import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable, forkJoin } from 'rxjs';
import { Team } from '../team';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { UserService } from '../../../user/user.service';

/**
 * Modal component for confirming team deletion.
 * Provides options to delete the team and optionally delete all associated users.
 */
@Component({
    selector: 'mage-delete-team',
    templateUrl: './delete-team.component.html',
    styleUrls: ['./delete-team.component.scss'],
    standalone: false
})
export class DeleteTeamComponent implements OnInit {
  team: Team;
  deleteAllUsers = false;
  deleting = false;
  error: string | null = null;

  /**
   * Constructor - initializes the component with injected services and team data.
   * @param dialogRef - Reference to the dialog for closing and returning results
   * @param data - Injected data containing the team to delete
   * @param teamsService - Service for team operations
   * @param adminUserService - Service for user operations
   */
  constructor(
    public dialogRef: MatDialogRef<DeleteTeamComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { team: Team },
    private teamsService: AdminTeamsService,
    private adminUserService: UserService
  ) {
    this.team = data.team;
  }

  ngOnInit(): void {}

  /**
   * Deletes the team and optionally its users if the option is selected.
   */
  deleteTeam(): void {
    this.deleting = true;
    this.error = null;

    this.teamsService.deleteTeam(this.team.id.toString()).subscribe({
      next: () => {
        if (this.deleteAllUsers) {
          this.deleteUsers();
        } else {
          this.dialogRef.close(this.team);
        }
      },
      error: (error) => {
        console.error('Error deleting team:', error);
        this.deleting = false;

        if (error.error?.message) {
          this.error = error.error.message;
        } else if (error.statusText && error.status) {
          this.error = `Error ${error.status}: ${error.statusText}`;
        } else if (error.message) {
          this.error = error.message;
        } else {
          this.error = 'Failed to delete team. Please try again.';
        }
      }
    });
  }

  /**
   * Cancels the deletion and closes the dialog without any action.
   */
  cancel(): void {
    this.dialogRef.close();
  }

  /**
   * Deletes all users associated with the team.
   */
  private deleteUsers(): void {
    const users = this.team.users || [];

    if (users.length === 0) {
      this.dialogRef.close(this.team);
      return;
    }

    const deleteRequests: Observable<any>[] = users
      .filter(u => !!u?.id)
      .map(u => this.adminUserService.deleteUser(String(u.id)));

    if (deleteRequests.length === 0) {
      this.dialogRef.close(this.team);
      return;
    }

    forkJoin(deleteRequests).subscribe({
      next: () => {
        this.dialogRef.close(this.team);
      },
      error: (error) => {
        console.error('Error deleting users:', error);
        this.dialogRef.close(this.team);
      }
    });
  }
}
