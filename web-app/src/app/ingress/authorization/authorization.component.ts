import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from 'src/app/user/user.service';

export interface AuthorizationEvent {
  token: string
}

@Component({
  selector: 'authorization',
  templateUrl: './authorization.component.html',
  styleUrls: ['./authorization.component.scss']
})
export class AuthorizationComponent {
  @Input() token: string
  @Output() authorized = new EventEmitter<AuthorizationEvent>()

  deviceId = new FormControl('', [Validators.required])

  constructor(
    private router: Router,
    private userService: UserService
  ) {
    this.token = this.router.getCurrentNavigation()?.extras?.state?.token
  }

  authorize(): void {
    this.deviceId.setErrors(null)
    this.userService.authorize(this.token, this.deviceId.value).subscribe({
      next: (response) => {
         this.authorized.emit({ token: response.token })
      },
      error: () => {
        this.deviceId.setErrors({ invalid: true})
      }
    })
  }
}
