import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CoreModule } from '../../core/core.module';
import { LayerDashboardComponent } from './dashboard/layer-dashboard.component';
import { CreateLayerDialogComponent } from './create-layer/create-layer.component';
import { LayersService } from './layers.service';
import { AdminBreadcrumbModule } from '../admin-breadcrumb/admin-breadcrumb.module';

@NgModule({
    declarations: [
        LayerDashboardComponent,
        CreateLayerDialogComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatPaginatorModule,
        MatTableModule,
        MatIconModule,
        MatSelectModule,
        MatFormFieldModule,
        MatTooltipModule,
        CoreModule,
        AdminBreadcrumbModule
    ],
    providers: [
        LayersService
    ],
    exports: [
        LayerDashboardComponent
    ]
})
export class AdminLayersModule { }
