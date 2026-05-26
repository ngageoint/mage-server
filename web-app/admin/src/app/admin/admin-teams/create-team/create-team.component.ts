import { Component, Inject } from '@angular/core';
import {
  MatDialogRef as MatDialogRef,
  MAT_DIALOG_DATA as MAT_DIALOG_DATA,
  MatDialogModule
} from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { Team } from '../team';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * Dialog component for creating new teams.
 * Provides a form interface with validation for team name (required) and description (optional).
 */
@Component({
  selector: 'mage-admin-team-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './create-team.component.html',
  styleUrls: ['./create-team.component.scss']
})
export class CreateTeamDialogComponent {
  teamForm: FormGroup;
  errorMessage: string = '';

  constructor(
    public dialogRef: MatDialogRef<CreateTeamDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { team: Partial<Team> },
    private fb: FormBuilder,
    private teamsService: AdminTeamsService
  ) {
    this.teamForm = this.fb.group({
      name: [data.team.name || '', [Validators.required]],
      description: [data.team.description || '']
    });
  }

  /**
   * Handles form submission for creating a new team.
   * Validates the form, creates the team via the teams service, and closes the dialog on success.
   */
  save(): void {
    if (this.teamForm.invalid) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.errorMessage = '';
    const teamData = this.teamForm.value;
    this.teamsService.createTeam(teamData).subscribe({
      next: (newTeam) => {
        this.dialogRef.close(newTeam);
      },
      error: (err) => {
        if (err.status === 409) {
          this.errorMessage = err.error;
        } else {
          this.errorMessage = 'Failed to create team. Please try again.';
        }
      }
    });
  }

  /**
   * Closes the dialog without saving any data or making any changes.
   */
  cancel(): void {
    this.dialogRef.close();
  }
}
