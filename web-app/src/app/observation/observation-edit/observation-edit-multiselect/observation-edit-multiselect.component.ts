import { Component, ViewChild, ElementRef, Input, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { RecentChoice } from 'core-lib-src/user';

interface Choice {
  title: string;
}

interface MultiSelectField {
  title: string,
  name: string,
  required: boolean,
  choices: Choice[],
  maxRecent?: number
}

@Component({
    selector: 'observation-edit-multiselect',
    templateUrl: './observation-edit-multiselect.component.html',
    styleUrls: ['./observation-edit-multiselect.component.scss'],
    standalone: false
})
export class ObservationEditMultiselectComponent implements OnInit {
  @Input() formGroup!: UntypedFormGroup
  @Input() definition!: MultiSelectField

  private _recentChoices: RecentChoice[] = []
  @Input()
  set recentChoices(value: RecentChoice[]) {
    this._recentChoices = value ?? []
  }
  get recentChoices(): RecentChoice[] {
    return this._recentChoices
  }

  @ViewChild('choiceInput', { static: false }) choiceInput!: ElementRef<HTMLInputElement>
  @ViewChild(MatAutocompleteTrigger, { static: false }) autocomplete!: MatAutocompleteTrigger

  separatorKeysCodes: number[] = [ENTER, COMMA]
  control!: UntypedFormControl
  choiceControl = new UntypedFormControl()
  recentChoicesFromDefinition: Choice[] = []
  filteredChoices$: Observable<Choice[]>
  recentChoices$: Observable<Choice[]>

  ngOnInit(): void {
    this.control = this.formGroup.get(this.definition.name) as UntypedFormControl

    this.recentChoicesFromDefinition = this.definition.maxRecent
      ? this.recentChoices
        .map(recent => this.definition.choices.find(choice => choice.title === recent))
        .filter((choice): choice is Choice => choice !== undefined)
      : []

    this.filteredChoices$ = this.choiceControl.valueChanges.pipe(
      startWith(''),
      map(value => !value || typeof value === 'string' ? value : value.title),
      map(title => title ? this.filter(title) : this.definition.choices.slice())
    )

    this.recentChoices$ = this.choiceControl.valueChanges.pipe(
      startWith(''),
      map(value => !value || typeof value === 'string' ? value : value.title),
      map(title => title ? this.recentFilter(title) : this.recentChoicesFromDefinition.slice())
    )
  }

  add(event: MatChipInputEvent): void {
    const choice = this.definition.choices.find((choice: Choice) => choice.title === event.value)
    if (!choice) return

    this.addChoice(choice.title)
    this.choiceInput.nativeElement.value = ''
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
    this.control.markAsDirty()
    this.choiceControl.setValue(null)
  }

  private recentFilter(title: string): Choice[] {
    const filterValue = title.toLowerCase()
    return this.recentChoicesFromDefinition.filter(option => option.title.toLowerCase().indexOf(filterValue) === 0)
  }

  private filter(value: string): Choice[] {
    const filterValue = value.toLowerCase()
    return this.definition.choices.filter(option => option.title.toLowerCase().indexOf(filterValue) === 0)
  }
}
