import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';

interface Scope {
  value: string;
  viewValue: string;
}

@Component({
    selector: 'admin-authentication-ldap',
    templateUrl: './admin-authentication-ldap.component.html',
    styleUrls: ['./admin-authentication-ldap.component.scss'],
    standalone: true,
    imports: [
      MatFormFieldModule,
      FormsModule,
      MatSelectModule,
      MatInputModule,
      MatExpansionModule,
    ]
})
export class AdminAuthenticationLDAPComponent implements OnInit {

  @Input() strategy: Strategy
  @Input() editable = true
  @Output() strategyDirty = new EventEmitter<boolean>();

  scopes: Scope[] = [
    {value: 'sub', viewValue: 'sub'},
    {value: 'base', viewValue: 'base'},
    {value: 'one', viewValue: 'one'}
  ];


  ngOnInit(): void {
    if (!this.strategy.settings.headers) {
      this.strategy.settings.headers = {};
    }

    if (!this.strategy.settings.profile) {
      this.strategy.settings.profile = {};
    }
  }

  setDirty(isDirty: boolean): void {
    this.strategy.isDirty = isDirty;
    this.strategyDirty.emit(isDirty);
  }
}
