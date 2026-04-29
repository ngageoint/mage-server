import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserService } from 'src/app/user/user.service';

export interface AuthorizationEvent {
  token: string
}

@Component({
  selector: 'authorization',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './authorization.component.html',
  styleUrls: ['./authorization.component.scss']
})
export class AuthorizationComponent {
  @Input() token: string
  @Output() authorized = new EventEmitter<AuthorizationEvent>()

  deviceId = new FormControl('', [Validators.required])

  constructor(
    private userService: UserService
  ) {}

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
