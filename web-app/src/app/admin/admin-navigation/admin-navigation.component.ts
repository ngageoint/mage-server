import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'admin-navigation',
  templateUrl: './admin-navigation.component.html',
  styleUrls: ['./admin-navigation.component.scss'],
  standalone: false
})
export class AdminNavigationComponent {
  @Input() stateName = '';
  @Input() inactiveUsers: any[] = [];
  @Input() unregisteredDevices: any[] = [];
  @Input() pluginTabs: any[] = [];
  @Output() pluginActiveChange = new EventEmitter<any>();

  identitiesExpanded = true;
  environmentExpanded = true;
  searchExpanded = true;
  securityExpanded = true;
  settingsExpanded = true;
  pluginsExpanded = true;
}
