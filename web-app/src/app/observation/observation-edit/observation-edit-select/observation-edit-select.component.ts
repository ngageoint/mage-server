import { Component, OnInit, input } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { RecentChoice } from 'core-lib-src/user';

export interface Choice {
  title: string;
}

interface SelectField {
  title: string,
  name: string,
  required: boolean,
  choices: Choice[],
  maxRecent?: number
}

@Component({
    selector: 'observation-edit-dropdown',
    templateUrl: './observation-edit-select.component.html',
    styleUrls: ['./observation-edit-select.component.scss'],
    imports: [AsyncPipe, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, NgxMatSelectSearchModule]
})
export class ObservationEditSelectComponent implements OnInit {
  formGroup = input<UntypedFormGroup>()
  definition = input<SelectField>()
  recentChoices = input<RecentChoice[]>([])

  recentChoicesFromDefinition: Choice[] = []
  searchControl: UntypedFormControl = new UntypedFormControl();
  filteredChoices$: Observable<any[]>;
  recentChoices$: Observable<any[]>;

  ngOnInit(): void {
    const definition = this.definition()

    this.recentChoicesFromDefinition = definition?.maxRecent
      ? this.recentChoices()
        .map(recent => definition.choices.find(choice => choice.title === recent))
        .filter((choice): choice is Choice => choice !== undefined)
      : []

    this.filteredChoices$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        return !value || typeof value === 'string' ? value : value.title
      }),
      map(title => {
        return title ? this.filter(title) : definition?.choices.slice() ?? []
      })
    );

    this.recentChoices$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      map(value => !value || typeof value === 'string' ? value : value.title),
      map(title => title ? this.recentFilter(title) : this.recentChoicesFromDefinition.slice())
    );
  }

  private recentFilter(title: string): Choice[] {
    const filterValue = title.toLowerCase();
    return this.recentChoicesFromDefinition.filter(option => option.title.toLowerCase().indexOf(filterValue) === 0);
  }

  private filter(title: string): Choice[] {
    const filterValue = title.toLowerCase();

    return this.definition()?.choices.filter(option => option.title.toLowerCase().indexOf(filterValue) === 0) ?? [];
  }

}
