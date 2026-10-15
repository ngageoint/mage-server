import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ApiService } from '../api/api.service';

@Component({
  selector: 'about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatToolbarModule]
})
export class AboutComponent {
  private location: Location = inject(Location);
  private router: Router = inject(Router);
  private apiService: ApiService = inject(ApiService);

  api = toSignal(this.apiService.getApi(), { initialValue: null });

  onBack(): void {
    if (window.history.state?.navigationId > 1) {
      this.location.back();
    } else {
      this.router.navigate(['home']);
    }
  }
}
