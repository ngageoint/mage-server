import { Component } from '@angular/core';

@Component({
  standalone: false,
  selector: 'sftp-admin',
  template: `
    <mat-tab-group>
      <mat-tab label="Configuration">
        <sftp-configuration></sftp-configuration>
      </mat-tab>
      <mat-tab label="Sync Status">
        <sftp-observation-status></sftp-observation-status>
      </mat-tab>
    </mat-tab-group>
  `
})
export class SftpAdminComponent {}
