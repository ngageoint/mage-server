import { Component, OnInit, Input } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
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
    standalone: false
})
export class ObservationEditSelectComponent implements OnInit {
  @Input() formGroup: UntypedFormGroup
  @Input() definition: SelectField

  private _recentChoices: RecentChoice[] = []
  @Input()
  set recentChoices(value: RecentChoice[]) {
    this._recentChoices = value ?? []
  }
  get recentChoices(): RecentChoice[] {
    return this._recentChoices
  }

  recentChoicesFromDefinition: Choice[] = []
  searchControl: UntypedFormControl = new UntypedFormControl();
  filteredChoices$: Observable<any[]>;
  recentChoices$: Observable<any[]>;

  ngOnInit(): void {
    this.recentChoicesFromDefinition = this.definition.maxRecent
      ? this.recentChoices
        .map(recent => this.definition.choices.find(choice => choice.title === recent))
        .filter((choice): choice is Choice => choice !== undefined)
      : []

    this.filteredChoices$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        return !value || typeof value === 'string' ? value : value.title
      }),
      map(title => {
        return title ? this.filter(title) : this.definition.choices.slice()
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

    return this.definition.choices.filter(option => option.title.toLowerCase().indexOf(filterValue) === 0);
  }

}
