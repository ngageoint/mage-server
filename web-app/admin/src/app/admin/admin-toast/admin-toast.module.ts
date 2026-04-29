import { NgModule } from '@angular/core';
import { MatSnackBarModule as MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { AdminToastComponent } from './admin-toast.component';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [
    AdminToastComponent,
    RouterModule,
    MatSnackBarModule,
    CommonModule
  ]
})
export class ToastModule {}
