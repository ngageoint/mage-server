import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class AdminToastService {
  constructor(private snackBar: MatSnackBar, private router: Router) {}

  show(
    message: string,
    route?: any[] | string,
    linkText?: string,
    duration = 10000
  ): void {
    const snackBarRef = this.snackBar.open(message, route ? (linkText || 'View') : undefined, {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });

    if (route) {
      snackBarRef.onAction().subscribe(() => {
        const commands = Array.isArray(route) ? route : [route];
        this.router.navigate(commands);
      });
    }
  }
}
