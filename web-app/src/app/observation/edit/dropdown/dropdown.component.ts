import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

export interface Choice {
  title: string;
}

@Component({
  selector: 'observation-edit-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss']
})
export class DropdownComponent implements OnInit {
  @Input() field: any;
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
        return title ? this.filter(title) : this.field.choices.slice()
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

    return this.field.choices.filter(option => option.title.toLowerCase().indexOf(filterValue) === 0);
  }

}
