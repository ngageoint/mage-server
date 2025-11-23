import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule } from '@angular/material/paginator';
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