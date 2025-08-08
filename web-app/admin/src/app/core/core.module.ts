import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardNavbarComponent } from './card-navbar/card-navbar.component';
import { FormsModule } from '@angular/forms';

@NgModule({
    declarations: [
        CardNavbarComponent
    ],
    imports: [
        CommonModule,
        FormsModule
    ],
    providers: [],
    exports: [
        CardNavbarComponent
    ]
})
export class CoreModule { }