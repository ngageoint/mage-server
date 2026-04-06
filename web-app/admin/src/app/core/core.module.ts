import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { Component } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { CardNavbarComponent } from './card-navbar/card-navbar.component';
import { SearchModalComponent } from './search-modal/search-modal.component';
import { DraggableListComponent } from './draggable-list/draggable-list.component';

@NgModule({
    declarations: [
        CardNavbarComponent,
        SearchModalComponent,
        DraggableListComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatIconModule,
        MatButtonModule,
        MatTableModule,
        MatProgressSpinnerModule,
        MatPaginatorModule,
        DragDropModule
    ],
    providers: [],
    exports: [
        CardNavbarComponent,
        SearchModalComponent,
        DraggableListComponent
    ]
})
export class CoreModule { }