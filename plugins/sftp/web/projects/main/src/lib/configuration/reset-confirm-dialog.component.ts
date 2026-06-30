import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'sftp-reset-confirm-dialog',
  template: `
    <div class="dialog-modal">
      <div class="dialog-header">
        <div class="warning-icon">
          <i class="fa fa-exclamation-triangle"></i>
        </div>
        <div class="header-content">
          <h2 class="dialog-title">Reset SFTP Plugin</h2>
          <p class="dialog-subtitle">This action cannot be undone</p>
        </div>
      </div>

      <div class="dialog-content">
        <div class="warning-message">
          <p>All SFTP settings will be reset to their defaults, including removing the stored private key and disabling the plugin.</p>
          <p>This cannot be undone. Are you sure you want to proceed?</p>
        </div>
      </div>

      <div class="dialog-actions">
        <button class="action-button" (click)="dialogRef.close(false)">Cancel</button>
        <button class="action-button btn-danger" (click)="dialogRef.close(true)">
          <i class="fa fa-refresh"></i>
          Reset to Defaults
        </button>
      </div>
    </div>
  `
})
export class ResetConfirmDialogComponent {
  constructor(public dialogRef: MatDialogRef<ResetConfirmDialogComponent>) { }
}
