import { Component, ViewChild, ElementRef, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'observation-edit-multiselectdropdown',
  templateUrl: './multiselectdropdown.component.html',
  styleUrls: ['./multiselectdropdown.component.scss']
})
export class MultiSelectDropdownComponent {
  @Input() field: any;

  @ViewChild('choiceInput', { static: false }) choiceInput: ElementRef<HTMLInputElement>;
  @ViewChild(MatAutocompleteTrigger, {static: false}) autocomplete: MatAutocompleteTrigger;

  visible = true;
  removable = true;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  choiceControl = new FormControl();
  filteredChoices: Observable<string[]>;

  constructor() {
    this.filteredChoices = this.choiceControl.valueChanges.pipe(
      startWith(null),
      map((choice: string | null) => choice ? this.filter(choice) : this.field.choices.slice()));
  }

  add(event: MatChipInputEvent): void {
    const choice = this.field.choices.find((choice: any) => choice.title === event.value);
    if (!choice) return;

    this.addChoice(choice.title)

    // Reset the input value
    if (event.input) {
      event.input.value = '';
    }

    this.choiceControl.setValue(null);
    this.autocomplete.closePanel();
  }

  remove(choice: string): void {
    const index = this.field.value.indexOf(choice);

    if (index >= 0) {
      this.field.value.splice(index, 1);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.addChoice(event.option.value)

    this.choiceInput.nativeElement.value = '';
    this.choiceControl.setValue(null);
  }

  private addChoice(choice: string): void {
    const choices = new Set(this.field.value);
    choices.add(choice);
    this.field.value = Array.from(choices);
  }

  private filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.field.choices.filter((choice: any) => choice.title.toLowerCase().indexOf(filterValue) === 0);
  }

}
