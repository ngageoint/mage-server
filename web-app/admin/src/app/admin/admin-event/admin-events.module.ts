import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { DragDropModule } from '@angular/cdk/drag-drop';

// Core Module (includes CardNavbarComponent)
import { CoreModule } from '../../core/core.module';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';
import { AdminEventFormModule } from './admin-event-form/admin-event-form.module';

// Components
import { EventDetailsComponent } from './event-details/event-details.component';
import { DeleteEventComponent } from './delete-event/delete-event.component';
import { CreateFormDialogComponent } from './create-form/create-form.component';

// AngularJS service providers
function stateFactory(i: any): any {
    return i.get('$state');
}

function stateParamsFactory(i: any): any {
    return i.get('$stateParams');
}

@NgModule({
    declarations: [
        EventDetailsComponent,
        DeleteEventComponent,
        CreateFormDialogComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        CoreModule,
        AdminBreadcrumbModule,
        AdminEventFormModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatDialogModule,
        MatDividerModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatTooltipModule,
        MatTableModule,
        MatPaginatorModule,
        DragDropModule
    ],
    providers: [
        {
            provide: '$state',
            useFactory: stateFactory,
            deps: ['$injector']
        },
        {
            provide: '$stateParams',
            useFactory: stateParamsFactory,
            deps: ['$injector']
        }
    ],
    exports: [
        EventDetailsComponent
    ]
})
export class AdminEventsModule { }