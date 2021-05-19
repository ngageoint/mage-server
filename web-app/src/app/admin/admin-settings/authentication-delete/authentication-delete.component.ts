import { Component, Inject, OnInit } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Strategy } from '../admin-settings.model';
import { AuthenticationConfigurationService, UserService } from 'src/app/upgrade/ajs-upgraded-providers';

@Component({
  selector: 'authentication-delete',
  templateUrl: './authentication-delete.component.html',
  styleUrls: ['./authentication-delete.component.scss']
})
export class AuthenticationDeleteComponent implements OnInit {
  users: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<AuthenticationDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public strategy: Strategy,
    @Inject(AuthenticationConfigurationService)
    private authenticationConfigurationService: any,
    @Inject(UserService)
    private userService: any) {
  }

  ngOnInit(): void {
    this.userService.getAllUsers().then(allUsers => {
      Object.keys(allUsers).forEach(key => {
        const user = allUsers[key];
        if (user.authentication.authenticationConfiguration.title === this.strategy.title) {
          this.users.push(user);
        }
      });
    }).catch(err => {
      console.error(err);
    })
  }

  close(): void {
    this.dialogRef.close('cancel');
  }

  delete(): void {
    this.authenticationConfigurationService.deleteConfiguration(this.strategy).then(() => {
      this.dialogRef.close('delete');
    }).catch(err => {
      console.error(err);
      this.dialogRef.close('cancel');
    });
  }

}