import { Component, Inject } from '@angular/core';
import {
  MatSnackBarRef as MatSnackBarRef,
  MAT_SNACK_BAR_DATA as MAT_SNACK_BAR_DATA
} from '@angular/material/snack-bar';

export interface AdminToastData {
  message: string;
  route?: any[] | string;
  linkText?: string;
}

@Component({
  selector: 'admin-toast',
  templateUrl: './admin-toast.component.html',
  styleUrls: ['./admin-toast.component.scss']
})
export class AdminToastComponent {
  constructor(
    private snackRef: MatSnackBarRef<AdminToastComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: AdminToastData
  ) {}

  close(): void {
    this.snackRef.dismiss();
  }
}
