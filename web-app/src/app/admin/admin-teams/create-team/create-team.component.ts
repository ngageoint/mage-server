import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'

@Component({
    selector: 'mage-admin-team-create',
    templateUrl: './create-team.component.html',
    styleUrls: ['./create-team.component.scss'],
    standalone: false
})
export class CreateTeamDialogComponent {
  private dialogRef = inject(MatDialogRef<CreateTeamDialogComponent>);
  private formBuilder = inject(FormBuilder);
  private teamsService = inject(TeamService);
  private data = inject<{ team?: Partial<Team> }>(MAT_DIALOG_DATA, { optional: true });

  isEditMode = !!this.data?.team?.id;

  saving = signal(false);
  serverError = signal('');

  form = this.formBuilder.group({
    name: [this.data?.team?.name || '', Validators.required],
    description: [this.data?.team?.description || '']
  });

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.saving.set(true);
    this.serverError.set('');

    const request = this.isEditMode
      ? this.teamsService.editTeam(this.data?.team?.id, this.form.value)
      : this.teamsService.createTeam(this.form.value);

    request.subscribe({
      next: (team) => {
        this.dialogRef.close(team);
      },
      error: (err) => {
        this.saving.set(false);
        this.serverError.set(
          err.status === 409 ? err.error : `Failed to ${this.isEditMode ? 'save' : 'create'} team. Please try again.`
        );
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
