import { Component, ViewChild, ElementRef, Input, AfterViewInit, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipList } from '@angular/material/chips';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

interface Choice {
  title: string;
}

interface MultiSelectField {
  title: string,
  name: string,
  required: boolean,
  choices: Choice[]
}

@Component({
  selector: 'observation-edit-multiselect',
  templateUrl: './observation-edit-multiselect.component.html',
  styleUrls: ['./observation-edit-multiselect.component.scss']
})
export class ObservationEditMultiselectComponent implements OnInit, AfterViewInit {
  @Input() formGroup: FormGroup
  @Input() definition: MultiSelectField

  @ViewChild('chipList', { static: false }) chipList: MatChipList
  @ViewChild('choiceInput', { static: false }) choiceInput: ElementRef<HTMLInputElement>
  @ViewChild(MatAutocompleteTrigger, {static: false}) autocomplete: MatAutocompleteTrigger

  visible = true
  removable = true
  separatorKeysCodes: number[] = [ENTER, COMMA]
  control: FormControl
  choiceControl = new FormControl()
  filteredChoices: Observable<Choice[]>

  constructor() {
    this.filteredChoices = this.choiceControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        return !value || typeof value === 'string' ? value : value.title
      }),
      map(title => {
        return title ? this.filter(title) : this.definition.choices.slice()
      })
    )
  }

  ngOnInit(): void {
    this.control = this.formGroup.get(this.definition.name) as FormControl
  }

  ngAfterViewInit(): void {
    this.control.statusChanges.subscribe(() => {
      this.checkErrorState()
    })
  }

  add(event: MatChipInputEvent): void {
    const choice = this.definition.choices.find((choice: Choice) => choice.title === event.value)
    if (!choice) return

    this.addChoice(choice.title)

    // Reset the input value
    if (event.input) {
      event.input.value = ''
    }

    this.autocomplete.closePanel()
  }

  remove(choice: string): void {
    const index = this.control.value.indexOf(choice)

    if (index >= 0) {
      this.control.value.splice(index, 1)
    }

    if (this.control.value.length === 0) {
      this.control.setValue(null)
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.addChoice(event.option.value)

    this.choiceInput.nativeElement.value = ''
  }

  private addChoice(choice: string): void {
    const choices = new Set(this.control.value)
    choices.add(choice)
    this.control.setValue(Array.from(choices))
    this.choiceControl.setValue(null)
  }

  private filter(value: string): Choice[] {
    const filterValue = value.toLowerCase()

    return this.definition.choices.filter(option => option.title.toLowerCase().indexOf(filterValue) === 0)
  }

  private checkErrorState(): void {
    this.chipList.errorState = this.definition.required && (!this.control.value || this.control.value.length === 0)
  }

}
