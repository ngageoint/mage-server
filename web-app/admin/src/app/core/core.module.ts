import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';

import { CardNavbarComponent } from './card-navbar/card-navbar.component';
import { SearchModalComponent } from './search-modal/search-modal.component';

@NgModule({
    declarations: [
        CardNavbarComponent,
        SearchModalComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatIconModule,
        MatButtonModule,
        MatTableModule,
        MatProgressSpinnerModule,
        MatPaginatorModule
    ],
    providers: [],
    exports: [
        CardNavbarComponent,
        SearchModalComponent
    ]
})
export class CoreModule { }