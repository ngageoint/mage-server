import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';

import { CoreModule } from '../../core/core.module';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { AdminEventFormModule } from './admin-event-form/admin-event-form.module';

import { EventDetailsComponent } from './event-details/event-details.component';
import { DeleteEventComponent } from './delete-event/delete-event.component';
import { CreateFormDialogComponent } from './create-form/create-form.component';
import { EventDashboardComponent } from './dashboard/event-dashboard.component';
import { MatLegacyOptionModule as MatOptionModule } from '@angular/material/legacy-core';
import { EventService } from 'src/app/event/event.service';
import { CreateEventDialogComponent } from './create-event/create-event.component';

@NgModule({
    declarations: [
        EventDashboardComponent,
        CreateEventDialogComponent,
        EventDetailsComponent,
        DeleteEventComponent,
        CreateFormDialogComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        CoreModule,
        ReactiveFormsModule,
        RouterModule,
        CoreModule,
        AdminBreadcrumbModule,
        AdminEventFormModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatDialogModule,
        MatFormFieldModule,
        MatDividerModule,
        MatIconModule,
        MatInputModule,
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        MatProgressSpinnerModule,
        AdminBreadcrumbModule,
        MatSelectModule,
        MatOptionModule,
        MatTooltipModule,
        MatTableModule,
        MatPaginatorModule,
        DragDropModule
    ],
    exports: [
        EventDashboardComponent,
        EventDetailsComponent
    ],
    providers: [
        EventService
    ]
})
export class AdminEventsModule { }