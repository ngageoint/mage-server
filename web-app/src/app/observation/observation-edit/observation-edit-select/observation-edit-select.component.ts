import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
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
  templateUrl: './observation-edit-select.component.html',
  styleUrls: ['./observation-edit-select.component.scss']
})
export class ObservationEditSelectComponent implements OnInit {
  @Input() formGroup: FormGroup
  @Input() definition: SelectField

  @Output() selectionChange = new EventEmitter<{value: any}>();

  searchControl: FormControl = new FormControl();
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
