import { NgModule } from '@angular/core';
import { LayerDashboardComponent } from './dashboard/layer-dashboard.component';
import { LayersService } from './layers.service';

@NgModule({
    imports: [
        LayerDashboardComponent
    ],
    providers: [
        LayersService
    ],
    exports: [
        LayerDashboardComponent
    ]
})
export class AdminLayersModule { }
