import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { TeamDashboardComponent } from './dashboard/team-dashboard.component';
import { CreateTeamDialogComponent } from './create-team/create-team.component';
import { TeamsService } from './teams-service';
import { CoreModule } from '../../core/core.module';

const routes: Routes = [
    {
        path: '',
        component: TeamDashboardComponent
    }
];

@NgModule({
    declarations: [
        TeamDashboardComponent,
        CreateTeamDialogComponent
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
        RouterModule.forChild(routes)
    ],
    providers: [
        TeamsService
    ],
    entryComponents: [
        CreateTeamDialogComponent
    ]
})
export class AdminTeamsModule { }