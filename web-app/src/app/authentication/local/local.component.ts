import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthenticationStrategy } from '../../api/api.entity';
import { UserService } from '../../user/user.service';
import { FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'local-authentication',
  templateUrl: './local.component.html',
  styleUrls: ['./local.component.scss']
})
export class LocalAuthenticationComponent implements OnInit {
  @Input() strategy: AuthenticationStrategy
  @Input() hideSignup: boolean

  @Output() onSignin = new EventEmitter<any>();
  @Output() onSignup = new EventEmitter<any>();

  username = new FormControl('', [Validators.required]);
  password = new FormControl('', [Validators.required]);

  error: {
    title: string,
    message: string
  }

  constructor(
    private userService: UserService
  ) {}

  ngOnInit(): void {
    console.log('hello local', this.hideSignup)
  }

  signin() {
    this.userService.signin(this.username.value, this.password.value).subscribe({
      next: (response: any) => {
        this.onSignin.emit(response)
      },
      error: (error: any) => {
        this.error = {
          title: 'Error signing in',
          message: error.data || 'Please check your username and password and try again.'
        };
      }
    })
  }

  signup(): void {
    this.onSignup.emit()
  }
}
