import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange as MatSelectChange, MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

export interface Choice {
  title: string;
}

interface SelectField {
  title: string,
  name: string,
  required: boolean,
  choices: Choice[]
}

@Component({
  selector: 'observation-edit-dropdown',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxMatSelectSearchModule
  ],
  templateUrl: './observation-edit-select.component.html',
  styleUrls: ['./observation-edit-select.component.scss']
})
export class ObservationEditSelectComponent implements OnInit {
  @Input() formGroup: UntypedFormGroup
  @Input() definition: SelectField

  @Output() selectionChange = new EventEmitter<{value: any}>();

  searchControl: UntypedFormControl = new UntypedFormControl();
  filteredChoices: Observable<any[]>;

  ngOnInit(): void {
    this.filteredChoices = this.searchControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        return !value || typeof value === 'string' ? value : value.title
      }),
      map(title => {
        return title ? this.filter(title) : this.definition.choices.slice()
      })
    );
  }

  onSelectionChange(event: MatSelectChange): void {
    this.selectionChange.emit({
      value: event.value
    })
  }

  private filter(title: string): Choice[] {
    const filterValue = title.toLowerCase();

    return this.definition.choices.filter(option => option.title.toLowerCase().indexOf(filterValue) === 0);
  }

}
