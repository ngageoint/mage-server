import { NgModule } from '@angular/core';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { RouterModule } from '@angular/router';
import { AdminToastComponent } from './admin-toast.component';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [AdminToastComponent],
  imports: [
    RouterModule,
    MatSnackBarModule,
    CommonModule
  ]
})
export class ToastModule {}
