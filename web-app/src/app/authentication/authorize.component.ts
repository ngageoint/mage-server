import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../user/user-service.service';

@Component({
  selector: 'authorize',
  templateUrl: './authorize.component.html',
  styleUrls: ['./authorize.component.scss']
})
export class AuthorizeComponent {
  token: string
  deviceId = new FormControl('', [Validators.required]);

  constructor(
    private router: Router,
    private userService: UserService
  ) {
    this.token = this.router.getCurrentNavigation()?.extras?.state?.token
  }

  authorize(): void {
    this.userService.authorize(this.token, this.deviceId.value).subscribe({
      next: () => {
        // TODO set token event"
        // $rootScope.$broadcast('event:user', {user: service.myself, token: LocalStorageService.getToken(), isAdmin: service.amAdmin});
        this.router.navigate(['mage']);
      },
      error: () => {
        // TODO show error message
      }
    })
  }
}
