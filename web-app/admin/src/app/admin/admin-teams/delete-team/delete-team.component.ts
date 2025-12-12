import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable, forkJoin } from 'rxjs';
import { Team } from '../team';
import { TeamsService } from '../teams-service';
import { UserService } from 'admin/src/app/upgrade/ajs-upgraded-providers';

/**
 * Modal component for confirming team deletion.
 * Provides options to delete the team and optionally delete all associated users.
 */
@Component({
  selector: 'mage-delete-team',
  templateUrl: './delete-team.component.html',
  styleUrls: ['./delete-team.component.scss']
})
export class DeleteTeamComponent implements OnInit {
  team: Team;
  deleteAllUsers = false;
  deleting = false;
  confirm: { text?: string } = {};

  /**
   * Constructor - initializes the component with injected services and team data.
   * @param dialogRef - Reference to the dialog for closing and returning results
   * @param data - Injected data containing the team to delete
   * @param teamsService - Service for team operations
   * @param UserService - Service for user operations
   */
  constructor(
    public dialogRef: MatDialogRef<DeleteTeamComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { team: Team },
    private teamsService: TeamsService,
    @Inject(UserService) private UserService
  ) {
    this.team = data.team;
  }

  /**
   * Component initialization lifecycle hook.
   */
  ngOnInit(): void {
  }

  /**
   * Deletes the team and optionally its users if the option is selected.
   */
  deleteTeam(): void {
    this.deleting = true;

    this.teamsService.deleteTeam(this.team.id.toString()).subscribe({
      next: () => {
        if (this.deleteAllUsers && (this.confirm.text === this.team.name)) {
          this.deleteUsers();
        } else {
          this.dialogRef.close(this.team);
        }
      },
      error: (error) => {
        console.error('Error deleting team:', error);
        this.deleting = false;
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

    const deletePromises: Observable<any>[] = users.map(user =>
      this.UserService.deleteUser(user)
    );

    forkJoin(deletePromises).subscribe({
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
