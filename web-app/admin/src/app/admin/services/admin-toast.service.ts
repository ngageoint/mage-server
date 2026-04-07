import { Injectable } from '@angular/core';
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar';
import {
  AdminToastComponent,
  AdminToastData
} from '../admin-toast/admin-toast.component';

@Injectable({ providedIn: 'root' })
export class AdminToastService {
  constructor(private snackBar: MatSnackBar) {}

  show(
    message: string,
    route?: any[] | string,
    linkText?: string,
    duration = 10000
  ): void {
    const data: AdminToastData = { message, route, linkText };

    this.snackBar.openFromComponent(AdminToastComponent, {
      data,
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      panelClass: ['mage-toast-panel']
    });
  }
}
