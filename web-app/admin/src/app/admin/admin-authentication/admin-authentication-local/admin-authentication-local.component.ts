import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';

@Component({
  selector: 'admin-authentication-local',
  templateUrl: './admin-authentication-local.component.html',
  styleUrls: ['./admin-authentication-local.component.scss']
})
export class AdminAuthenticationLocalComponent {

  @Input() strategy: Strategy
  @Input() editable = true
  @Output() strategyDirty = new EventEmitter<boolean>();

  onStrategyDirty(isDirty: boolean): void {
    this.strategyDirty.emit(isDirty);
}
}
