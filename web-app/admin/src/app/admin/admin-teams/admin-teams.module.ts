import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { TeamDashboardComponent } from './dashboard/team-dashboard.component';
import { CreateTeamDialogComponent } from './create-team/create-team.component';
import { TeamsService } from './teams-service';
import { EventsService } from '../admin-event/events.service';
import { TeamDetailsComponent } from './team-details/team-details.component';
import { CoreModule } from '../../core/core.module';
import { DeleteTeamComponent } from './delete-team/delete-team.component';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    ],
    providers: [
        TeamsService,
        EventsService
    ],
    entryComponents: [
        CreateTeamDialogComponent,
        DeleteTeamComponent
    ]
})
export class AdminTeamsModule { }