import { buildTitleMap, isArray, JsonSchemaFormService } from '@ajsf/core';
import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { AbstractControl, FormControl } from '@angular/forms';
import { MAT_LABEL_GLOBAL_OPTIONS } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-autocomplete-material-select',
  templateUrl: './json-schema-widget-autocomplete.component.html',
  styleUrls: ['./json-schema-widget-autocomplete.component.scss']
})

export class JsonSchemaWidgetAutocompleteComponent implements OnInit {
  formControl: AbstractControl = new FormControl();
  controlName: string;
  controlValue: any;
  controlDisabled = false;
  boundControl = false;
  options: any;
  selectList: any[] = [];
  isArray = isArray;
  differ: any;
  boundDisplayValue: (value: string) => string;
  filteredTitleMap: Observable<any>;
  @Input() layoutNode: any;
  @Input() layoutIndex: number[];
  @Input() dataIndex: number[];

  constructor(
    @Inject(MAT_FORM_FIELD_DEFAULT_OPTIONS) @Optional() public matFormFieldDefaultOptions,
    @Inject(MAT_LABEL_GLOBAL_OPTIONS) @Optional() public matLabelGlobalOptions,
    private jsf: JsonSchemaFormService
  ) {

  }

  private _filter(value: any): any[] {
    if (!value) {
      return this.selectList;
    }

    const filterValue = value.toLowerCase();
    return this.selectList.filter(option => {
      if (!option.name) {
        return false;
      }
      return option.name.toLowerCase().includes(filterValue);
    });
  }

  ngOnInit(): void {
    this.layoutNode = this.layoutNode || {};
    this.options = this.layoutNode.options || {};
    if (this.options.titleMap || this.options.enumNames || this.options.enum) {
      this.selectList = buildTitleMap(
        this.options.titleMap || this.options.enumNames,
        this.options.enum, !!this.options.required, !!this.options.flatList
      );
      this.jsf.initializeControl(this, !this.options.readonly);
      if (!this.options.notitle && !this.options.description && this.options.placeholder) {
        this.options.description = this.options.placeholder;
      }

      this.filteredTitleMap = this.formControl.valueChanges.pipe(
        startWith(''),
        map(value => this._filter(value))
      );

      this.boundDisplayValue = this.titleMapDisplay.bind(this);
    }
  }

  updateValue(event): void {
    if (!this.boundControl) {
      this.options.showErrors = true;
      this.jsf.updateValue(this, event.option.value);
    }
  }

  titleMapDisplay(selectedItem: string): string {
    if (this.selectList && selectedItem) {
      const found = this.selectList.find((value: any) => {
        return value.value === selectedItem;
      });
      return found.name;
    }
    return '';
  }
}
