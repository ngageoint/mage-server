import { Component, Inject, signal } from '@angular/core';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { Observable, forkJoin } from 'rxjs';
import { UserService } from '../../../user/user.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { A11yModule } from '@angular/cdk/a11y';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

/**
 * Modal component for confirming team deletion.
 * Provides options to delete the team and optionally delete all associated users.
 */
@Component({
    selector: 'mage-delete-team',
    templateUrl: './delete-team.component.html',
    styleUrls: ['./delete-team.component.scss'],
    standalone: true,
    imports: [
      MatDialogModule,
      MatButtonModule,
      MatIconModule,
      A11yModule,
      MatCheckboxModule,
      FormsModule
    ]
})
export class DeleteTeamComponent {
  team: Team;
  deleteAllUsers = false;
  readonly deleting = signal(false);
  readonly error = signal<string | null>(null);

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
    private teamsService: TeamService,
    private adminUserService: UserService
  ) {
    this.team = data.team;
  }

  /**
   * Deletes the team and optionally its users if the option is selected.
   */
  deleteTeam(): void {
    this.deleting.set(true);
    this.error.set(null);

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
        this.deleting.set(false);

        if (error.error?.message) {
          this.error.set(error.error.message);
        } else if (error.statusText && error.status) {
          this.error.set(`Error ${error.status}: ${error.statusText}`);
        } else if (error.message) {
          this.error.set(error.message);
        } else {
          this.error.set('Failed to delete team. Please try again.');
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
    const users = this.team.userIds || [];

    if (users.length === 0) {
      this.dialogRef.close(this.team);
      return;
    }

    const deleteRequests: Observable<any>[] = users
      .map(u => this.adminUserService.deleteUser(u));

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
