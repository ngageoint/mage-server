import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../../user/user.service';
import { SidenavService } from '../sidenav.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'admin-navbar',
  templateUrl: './admin-navbar.component.html',
  styleUrls: ['./admin-navbar.component.scss'],
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    RouterLink
  ]
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
