import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'

@Component({
    selector: 'mage-admin-team-create',
    templateUrl: './create-team.component.html',
    styleUrls: ['./create-team.component.scss'],
    imports: [
      ReactiveFormsModule,
      MatDialogModule,
      MatButtonModule,
      MatIconModule,
      MatInputModule
    ]
})
export class CreateTeamDialogComponent {
  private dialogRef: MatDialogRef<CreateTeamDialogComponent> = inject(MatDialogRef<CreateTeamDialogComponent>);
  private formBuilder: FormBuilder = inject(FormBuilder);
  private teamsService: TeamService = inject(TeamService);
  private data: { team?: Partial<Team> } | null = inject<{ team?: Partial<Team> }>(MAT_DIALOG_DATA, { optional: true });

  isEditMode = Boolean(this.data?.team?.id);

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
      error: (err: HttpErrorResponse) => {
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
