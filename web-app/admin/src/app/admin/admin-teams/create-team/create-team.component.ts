import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeamsService } from '../teams-service';
import { Team } from '../team';

/**
 * Dialog component for creating new teams.
 * Provides a form interface with validation for team name (required) and description (optional).
 */
@Component({
    selector: 'mage-admin-team-create',
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
        private teamsService: TeamsService
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
            error: () => {
                this.errorMessage = 'Failed to create team. Please try again.';
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
