import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule as MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule as MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TeamDashboardComponent } from './dashboard/team-dashboard.component';
import { CreateTeamDialogComponent } from './create-team/create-team.component';
import { AdminEventsService } from '../services/admin-events.service';
import { TeamDetailsComponent } from './team-details/team-details.component';
import { DeleteTeamComponent } from './delete-team/delete-team.component';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { MatTooltipModule as MatTooltipModule } from '@angular/material/tooltip';
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
        ReactiveFormsModule,
        MatPaginatorModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        MatCardModule,
        MatListModule,
        MatMenuModule,
        MatDividerModule,
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