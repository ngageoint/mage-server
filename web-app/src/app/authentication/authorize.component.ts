import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UserService } from '../user/user-service.service';

@Component({
  selector: 'authorize',
  templateUrl: './authorize.component.html',
  styleUrls: ['./authorize.component.scss']
})
export class AuthorizeComponent implements OnInit {
  token: string
  deviceId = new FormControl('', [Validators.required]);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params: Params) => {
      this.token = params['token']
    })
  }

  authorize(): void {
    this.userService.authorize(this.token, this.deviceId.value).subscribe({
      next: () => {
        // TODO set token event"
        // $rootScope.$broadcast('event:user', {user: service.myself, token: LocalStorageService.getToken(), isAdmin: service.amAdmin});
        this.router.navigate(['map']);
      },
      error: () => {
        // TODO show error message
      }
    })
  }
}
