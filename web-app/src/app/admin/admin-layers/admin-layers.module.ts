import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule as MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule as MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { LayerDashboardComponent } from './dashboard/layer-dashboard.component';
import { LayersService } from './layers.service';
import { LayerDetailsComponent } from './layer-details/layer-details.component';
import { LayerPreviewComponent } from './layer-preview/layer-preview.component';
import { RouterModule } from '@angular/router';

@NgModule({
    declarations: [
        LayerDetailsComponent,
        LayerPreviewComponent,
    ],
    imports: [
        CommonModule,
        LayerDashboardComponent,
        FormsModule,
        MatButtonModule,
        MatPaginatorModule,
        MatIconModule,
        MatFormFieldModule,
        MatCardModule,
        MatDividerModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatInputModule,
        MatListModule,
        RouterModule
    ],
    providers: [
        LayersService
    ],
    exports: [
        LayerDashboardComponent
    ]
})
export class AdminLayersModule { }
