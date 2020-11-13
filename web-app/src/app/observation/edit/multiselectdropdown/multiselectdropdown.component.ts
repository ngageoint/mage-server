import { Component, ViewChild, ElementRef, Input, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent, MatAutocompleteSelectedEvent, MatAutocompleteTrigger, MatChipList } from '@angular/material';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

interface Choice {
  title: string;
}

interface MultiSelectDropdownField {
  title: string,
  name: string,
  value?: string[],
  required: boolean,
  choices: Choice[]
}

@Component({
  selector: 'observation-edit-multiselectdropdown',
  templateUrl: './multiselectdropdown.component.html',
  styleUrls: ['./multiselectdropdown.component.scss']
})
export class MultiSelectDropdownComponent implements AfterViewInit {
  @Input() field: MultiSelectDropdownField

  @ViewChild('dropdown', { static: false }) dropdown: FormControl
  @ViewChild('chipList', { static: false }) chipList: MatChipList
  @ViewChild('choiceInput', { static: false }) choiceInput: ElementRef<HTMLInputElement>
  @ViewChild(MatAutocompleteTrigger, {static: false}) autocomplete: MatAutocompleteTrigger

  visible = true
  removable = true
  separatorKeysCodes: number[] = [ENTER, COMMA]
  choiceControl = new FormControl()
  filteredChoices: Observable<any[]>

  constructor() {
    this.filteredChoices = this.choiceControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        return !value || typeof value === 'string' ? value : value.title
      }),
      map(title => {
        return title ? this.filter(title) : this.field.choices.slice()
      })
    )
  }

  ngAfterViewInit(): void {
    this.dropdown.statusChanges.subscribe(() => {
      this.checkErrorState()
    })
  }

  add(event: MatChipInputEvent): void {
    const choice = this.field.choices.find((choice: Choice) => choice.title === event.value)
    if (!choice) return

    this.addChoice(choice.title)

    // Reset the input value
    if (event.input) {
      event.input.value = ''
    }

    this.choiceControl.setValue(null)
    this.autocomplete.closePanel()
  }

  remove(choice: string): void {
    const index = this.field.value.indexOf(choice)

    if (index >= 0) {
      this.field.value.splice(index, 1)
    }

    if (this.field.value.length === 0) {
      delete this.field.value;
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.addChoice(event.option.value)

    this.choiceInput.nativeElement.value = ''
    this.choiceControl.setValue(null)
  }

  private addChoice(choice: string): void {
    const choices = new Set(this.field.value)
    choices.add(choice)
    this.field.value = Array.from(choices)
  }

  private filter(value: string): Choice[] {
    const filterValue = value.toLowerCase()

    return this.field.choices.filter(option => option.title.toLowerCase().indexOf(filterValue) === 0)
  }

  private checkErrorState(): void {
    this.chipList.errorState = this.field.required && (!this.field.value || this.field.value.length === 0)
  }

}
