import { Component, Input } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';

@Component({
  selector: 'admin-authentication-local',
  templateUrl: './admin-authentication-local.component.html',
  styleUrls: ['./admin-authentication-local.component.scss']
})
export class AdminAuthenticationLocalComponent {

  @Input() strategy: Strategy
  @Input() editable = true
}
