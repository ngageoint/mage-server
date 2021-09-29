import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-local',
  templateUrl: './admin-authentication-local.component.html',
  styleUrls: ['./admin-authentication-local.component.scss']
})
export class AdminAuthenticationLocalComponent implements OnChanges {

  @Input() strategy: Strategy
  @Input() editable = true

  formGroup = new FormGroup({})

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.strategy) {
     
    }
  }
}
