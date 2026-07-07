import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../../user/user.service';
import { SidenavService } from '../sidenav.service';

@Component({
  selector: 'admin-navbar',
  templateUrl: './admin-navbar.component.html',
  styleUrls: ['./admin-navbar.component.scss'],
  standalone: false
})
export class AdminNavbarComponent {
  constructor(
    private userService: UserService,
    private router: Router,
    private sidenavService: SidenavService
  ) {}

  toggleSidenav(): void {
    this.sidenavService.toggle();
  }

  logout(): void {
    this.userService.logout().subscribe(() => {
      this.router.navigate(['landing']);
    });
  }
}
