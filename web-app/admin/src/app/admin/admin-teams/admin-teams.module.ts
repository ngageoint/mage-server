import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';

import { TeamDashboardComponent } from './dashboard/team-dashboard.component';
import { CreateTeamDialogComponent } from './create-team/create-team.component';
import { AdminEventsService } from '../services/admin-events.service';
import { TeamDetailsComponent } from './team-details/team-details.component';
import { CoreModule } from '../../core/core.module';
import { DeleteTeamComponent } from './delete-team/delete-team.component';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { AdminTeamsService } from '../services/admin-teams-service';
import { RouterModule } from '@angular/router';

@NgModule({
    declarations: [
        TeamDashboardComponent,
        CreateTeamDialogComponent,
        TeamDetailsComponent,
        DeleteTeamComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        CoreModule,
        ReactiveFormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        MatProgressSpinnerModule,
        AdminBreadcrumbModule,
        MatTooltipModule,
        RouterModule
    ],
    providers: [
        AdminTeamsService,
        AdminEventsService
    ],
})
export class AdminTeamsModule { }