import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../user/user.service';
import { LocalStorageService } from '../http/local-storage.service';

@Component({
  selector: 'authorize',
  templateUrl: './authorize.component.html',
  styleUrls: ['./authorize.component.scss']
})
export class AuthorizeComponent {
  token: string
  deviceId = new FormControl('', [Validators.required])

  constructor(
    private router: Router,
    private userService: UserService,
    private localStorageService: LocalStorageService
  ) {
    this.token = this.router.getCurrentNavigation()?.extras?.state?.token
  }

  authorize(): void {
    this.deviceId.setErrors(null)
    this.userService.authorize(this.token, this.deviceId.value).subscribe({
      next: (response) => {
        this.localStorageService.setToken(response.token)
        this.router.navigate(['map']);
      },
      error: () => {
        this.deviceId.setErrors({ invalid: true})
        // TODO show error message
      }
    })
  }
}
