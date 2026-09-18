import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
    selector: 'admin-authentication-oauth2',
    templateUrl: './admin-authentication-oauth2.component.html',
    styleUrls: ['./admin-authentication-oauth2.component.scss'],
    standalone: true,
    imports: [
      FormsModule,
      MatFormFieldModule,
      MatInputModule,
      MatSlideToggleModule,
      MatExpansionModule
    ]
})
export class AdminAuthenticationOAuth2Component implements OnInit {

  @Input() strategy: Strategy
  @Input() editable = true
  @Output() strategyDirty = new EventEmitter<boolean>();

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
