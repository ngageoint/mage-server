import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { Strategy } from '../../../admin-authentication/admin-settings.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'password-policy',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: 'password-policy.component.html',
  styleUrls: ['./password-policy.component.scss']
})
export class PasswordPolicyComponent implements OnInit {
  @Input() strategy: Strategy;
  @Output() strategyDirty = new EventEmitter<boolean>();

  ngOnInit(): void {
    if (this.strategy.settings.passwordPolicy) {
      this.buildPasswordHelp();
    }
  }

  buildPasswordHelp(): void {
    if (this.strategy.settings.passwordPolicy) {
      if (!this.strategy.settings.passwordPolicy.customizeHelpText) {
        const policy = this.strategy.settings.passwordPolicy;
        const templates = Object.entries(policy.helpTextTemplate)
          .filter(([key]) => policy[`${key}Enabled`] === true)
          .map(([key, value]) => {
            return (value as string).replace('#', policy[key]);
          });

        this.strategy.settings.passwordPolicy.helpText = `Password is invalid, must ${templates.join(
          ' and '
        )}.`;
      }
    }
  }

  setDirty(isDirty: boolean): void {
    this.strategy.isDirty = isDirty;
    this.strategyDirty.emit(isDirty);
  }
}
