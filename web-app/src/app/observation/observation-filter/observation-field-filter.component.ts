import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core'
import { AsyncPipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { ErrorStateMatcher } from '@angular/material/core'
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete'
import { MatButtonModule } from '@angular/material/button'
import { MatChipGrid, MatChipsModule } from '@angular/material/chips'
import { MatDatepicker, MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatTooltipModule } from '@angular/material/tooltip'
import { Observable, map, startWith } from 'rxjs'
import { Condition, SimpleCondition } from '../../entities/observation/filter/entities.observation.filter'
import {
  AutocompleteOption,
  buildFieldGroups,
  CHOICE_COMPARATORS,
  CHOICE_FIELD_TYPES,
  COMPARATORS_BY_TYPE,
  ConditionState,
  FilterCondition,
  FilterConditionGroup,
  FormGroup,
  NULL_OPERATORS,
  TEXT_COMPARATORS,
  ValueOption,
} from './observation-field-filter.types'

@Component({
  selector: 'observation-field-filter',
  templateUrl: './observation-field-filter.component.html',
  styleUrls: ['./observation-field-filter.component.scss'],
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule
  ]
})
export class ObservationFieldFilterComponent implements OnChanges {
  @Input() forms: any[] = []
  @Input() condition: Condition | null | undefined = null
  @Input() showIncompleteError = false
  @Output() conditionChanged = new EventEmitter<Condition | undefined>()

  @ViewChild('filterInput') filterInput: ElementRef<HTMLInputElement>
  @ViewChild(MatAutocompleteTrigger) autoTrigger: MatAutocompleteTrigger
  @ViewChild('filterDatePicker') datePicker: MatDatepicker<any>
  @ViewChild('chipGridCondition') chipGridCondition?: MatChipGrid

  incompleteErrorStateMatcher: ErrorStateMatcher = {
    isErrorState: () => this.showInvalidNumberError || (this.showIncompleteError && this.hasIncompleteCondition)
  }

  showInvalidNumberError = false

  inputControl = new FormControl('')
  conditionGroups: FilterConditionGroup[] = []
  filteredOptions: Observable<AutocompleteOption[]>
  filteredFormGroups: Observable<FormGroup[]>

  conditionState: ConditionState = 'field'
  selectedField: any = null
  selectedFormId: number = null
  selectedFormName: string = null
  selectedFormColor: string = null
  selectedOperator: string = null
  selectedOperatorDisplay: string = null

  pendingValue: any = null
  pendingValueDisplay: string = null

  private allFieldGroups: FormGroup[] = []

  get hasConditions(): boolean {
    return this.conditionGroups.some(g => g.conditions.length > 0)
  }

  get isDateValueState(): boolean {
    return this.conditionState === 'value' && this.selectedField?.type === 'date'
  }

  get isNullOperatorState(): boolean {
    return this.conditionState === 'value' && NULL_OPERATORS.includes(this.selectedOperator)
  }

  get hasValue(): boolean {
    if (this.conditionState !== 'value') return false
    if (this.isNullOperatorState) return true
    if (this.pendingValue != null) return true
    return (this.inputControl.value || '').toString().trim().length > 0
  }

  get hasInvalidNumberValue(): boolean {
    if (this.conditionState !== 'value') return false
    if (this.selectedField?.type !== 'numberfield') return false
    if (this.pendingValue != null) return false
    const input = (this.inputControl.value || '').toString().trim()
    if (!input) return false
    return isNaN(Number(input))
  }

  // true whenever the user has started picking a field/operator/value
  // but hasn't clicked Add or New Group to actually commit it yet.
  get hasIncompleteCondition(): boolean {
    return this.conditionState !== 'field'
  }

  get inputPlaceholder(): string {
    switch (this.conditionState) {
      case 'field': return 'Add Condition...'
      case 'comparator': return 'Select operator...'
      case 'value': return 'Enter value...'
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.forms) {
      this.allFieldGroups = buildFieldGroups(this.forms)
      this.conditionGroups = []
      this.resetState()
    }

    if (changes.condition) {
      this.populateCondition(this.condition)
    }

    if (changes.showIncompleteError) {
      this.updateChipGridErrorState()
    }
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const option: AutocompleteOption = event.option.value

    switch (option.type) {
      case 'field':
        this.conditionState = 'comparator'
        this.selectedField = option.field
        this.selectedFormId = option.formId
        this.selectedFormName = option.formName
        this.selectedFormColor = option.formColor
        this.clearInput()
        this.setupFilteredOptions()
        break
      case 'comparator':
        this.conditionState = 'value'
        this.selectedOperator = option.operator
        this.selectedOperatorDisplay = option.display
        if (NULL_OPERATORS.includes(option.operator)) {
          break
        }
        if (this.selectedField?.type === 'date') {
          this.clearInput()
          setTimeout(() => this.datePicker?.open())
          return
        }
        this.clearInput()
        this.setupFilteredOptions()
        break
      case 'value': {
        const valueOption = option as ValueOption
        this.pendingValue = valueOption.value
        this.pendingValueDisplay = valueOption.display
        this.clearInput()
        return
      }
    }

    this.updateChipGridErrorState()

    setTimeout(() => {
      this.filterInput?.nativeElement?.focus()
      this.autoTrigger?.openPanel()
    })
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onValueEnter()
      return
    }
    if (event.key === 'Backspace' && !(this.inputControl.value || '').toString()) {
      if (this.conditionState === 'value') {
        this.removeOperatorChip()
      } else if (this.conditionState === 'comparator') {
        this.removeFieldChip()
      }
      return
    }
    if (event.key === 'Escape' && this.autoTrigger?.panelOpen) {
      event.stopPropagation()
      this.autoTrigger.closePanel()
    }
  }

  removeFieldChip(): void {
    this.conditionState = 'field'
    this.selectedField = null
    this.selectedFormId = null
    this.selectedFormName = null
    this.selectedFormColor = null
    this.selectedOperator = null
    this.selectedOperatorDisplay = null
    this.pendingValue = null
    this.pendingValueDisplay = null
    this.clearInput()
    this.setupFilteredOptions()
    this.updateChipGridErrorState()
    setTimeout(() => this.autoTrigger?.openPanel())
  }

  removeOperatorChip(): void {
    this.conditionState = 'comparator'
    this.selectedOperator = null
    this.selectedOperatorDisplay = null
    this.pendingValue = null
    this.pendingValueDisplay = null
    this.clearInput()
    this.setupFilteredOptions()
    this.updateChipGridErrorState()
    setTimeout(() => this.autoTrigger?.openPanel())
  }

  removeValueChip(): void {
    this.pendingValue = null
    this.pendingValueDisplay = null
    this.clearInput()
    this.setupFilteredOptions()
    setTimeout(() => this.autoTrigger?.openPanel())
  }

  onDateSelected(event: MatDatepickerInputEvent<any>): void {
    if (!event.value) return
    const date = event.value.toDate ? event.value.toDate() : event.value
    this.pendingValue = date.toISOString()
  }

  onValueEnter(): void {
    if (this.conditionState !== 'value') return
    if (this.isNullOperatorState) { this.finalizeCondition(); return }
    const value = this.resolveValue()
    if (value == null) { this.blockIfInvalidNumber(); return }
    this.finalizeCondition(value)
  }

  addOr(): void {
    if (this.conditionState !== 'value') return
    if (this.isNullOperatorState) {
      this.finalizeCondition()
      return
    }
    const value = this.resolveValue()
    if (value == null) { this.blockIfInvalidNumber(); return }
    this.finalizeCondition(value)
  }

  addAnd(): void {
    if (this.conditionState !== 'value') return
    if (this.isNullOperatorState) {
      this.conditionGroups.push({ conditions: [] })
      this.finalizeCondition()
      return
    }
    const value = this.resolveValue()
    if (value == null) { this.blockIfInvalidNumber(); return }
    this.conditionGroups.push({ conditions: [] })
    this.finalizeCondition(value)
  }

  private blockIfInvalidNumber(): void {
    if (!this.hasInvalidNumberValue) return
    this.showInvalidNumberError = true
    this.updateChipGridErrorState()
  }

  clear(): void {
    this.conditionGroups = []
    this.resetState()
  }

  removeCondition(groupIndex: number, conditionIndex: number): void {
    const group = this.conditionGroups[groupIndex]
    group.conditions.splice(conditionIndex, 1)
    if (group.conditions.length === 0) {
      this.conditionGroups.splice(groupIndex, 1)
    }
    this.emitCondition()
  }

  private clearInput(): void {
    this.inputControl.setValue('', { emitEvent: false })
    if (this.filterInput) {
      this.filterInput.nativeElement.value = ''
    }
    if (this.showInvalidNumberError) {
      this.showInvalidNumberError = false
      this.updateChipGridErrorState()
    }
  }

  private resolveValue(): any {
    if (this.pendingValue != null) return this.pendingValue
    const input = (this.inputControl.value || '').toString().trim()
    if (!input) return null
    if (this.selectedField?.type === 'numberfield') {
      const value = Number(input)
      return isNaN(value) ? null : value
    }
    return input
  }

  private resetState(): void {
    this.conditionState = 'field'
    this.selectedField = null
    this.selectedFormId = null
    this.selectedFormName = null
    this.selectedFormColor = null
    this.selectedOperator = null
    this.selectedOperatorDisplay = null
    this.pendingValue = null
    this.pendingValueDisplay = null
    this.clearInput()
    this.setupFilteredOptions()
    this.updateChipGridErrorState()
  }

  private updateChipGridErrorState(): void {
    this.chipGridCondition?.updateErrorState()
  }

  private setupFilteredOptions(): void {
    const query$ = this.inputControl.valueChanges.pipe(
      startWith(this.inputControl.value || ''),
      map(value => typeof value === 'string' ? value : '')
    )

    this.filteredOptions = query$.pipe(
      map(query => this.getOptionsForState(query))
    )

    this.filteredFormGroups = query$.pipe(
      map(query => this.getFilteredFieldGroups(query))
    )
  }

  private getFilteredFieldGroups(query: string): FormGroup[] {
    const q = (query || '').toLowerCase()
    return this.allFieldGroups
      .map(group => ({
        formName: group.formName,
        formColor: group.formColor,
        fields: group.fields.filter(f => f.display.toLowerCase().includes(q)),
      }))
      .filter(group => group.fields.length > 0)
  }

  private getOptionsForState(query: string): AutocompleteOption[] {
    const q = (query || '').toLowerCase()

    switch (this.conditionState) {
      case 'comparator': {
        const comparators = COMPARATORS_BY_TYPE[this.selectedField?.type] || CHOICE_COMPARATORS
        return comparators
          .filter(c => c.display.toLowerCase().includes(q) || c.operator.toLowerCase().includes(q))
          .map(c => ({ type: 'comparator' as const, display: c.display, operator: c.operator }))
      }

      case 'value': {
        if (this.selectedField?.type === 'checkbox') {
          return ['true', 'false']
            .filter(value => value.includes(q))
            .map(value => ({ type: 'value' as const, display: value, value: value === 'true' }))
        }
        if (CHOICE_FIELD_TYPES.includes(this.selectedField?.type) && this.selectedField?.choices) {
          return this.selectedField.choices
            .filter((choice: any) => !choice.blank && choice.title.toLowerCase().includes(q))
            .map((choice: any) => ({ type: 'value' as const, display: choice.title, value: choice.title }))
        }
        return []
      }
      default:
        return []
    }
  }

  private finalizeCondition(value?: any): void {
    const formId = this.selectedFormId
    const field = this.selectedField.name
    let condition: SimpleCondition

    if (NULL_OPERATORS.includes(this.selectedOperator)) {
      condition = { formId, field, operator: this.selectedOperator as any }
    } else {
      condition = { formId, field, operator: this.selectedOperator as any, value }
    }

    let displayVal = value
    if (this.selectedField?.type === 'date' && value) {
      displayVal = new Date(value).toLocaleDateString()
    }

    const opLabel = this.selectedOperatorDisplay ?? this.selectedOperator
    const displayValue = NULL_OPERATORS.includes(this.selectedOperator)
      ? `${this.selectedField.title} ${opLabel}`
      : `${this.selectedField.title} ${opLabel} ${displayVal}`

    if (this.conditionGroups.length === 0) {
      this.conditionGroups.push({ conditions: [] })
    }

    const lastGroup = this.conditionGroups[this.conditionGroups.length - 1]
    lastGroup.conditions.push({
      field: this.selectedField,
      formId: this.selectedFormId,
      formName: this.selectedFormName,
      formColor: this.selectedFormColor,
      operator: this.selectedOperator,
      value,
      displayValue,
      condition,
    })

    this.emitCondition()
    this.resetState()
  }

  private populateCondition(condition: Condition | null | undefined): void {
    if (!condition) return
    this.conditionGroups = this.conditionGroupsFromFilter(condition)
  }

  private conditionGroupsFromFilter(condition: any): FilterConditionGroup[] {
    if ('and' in condition) {
      return condition.and.map((c: any) => this.conditionGroupFromNode(c))
    }
    return [this.conditionGroupFromNode(condition)]
  }

  private conditionGroupFromNode(node: any): FilterConditionGroup {
    const simples: any[] = 'or' in node ? node.or : [node]
    return {
      conditions: simples.map(s => this.filterConditionFromSimple(s)).filter(Boolean)
    }
  }

  private filterConditionFromSimple(simple: any): FilterCondition | null {
    const fieldOption = this.allFieldGroups
      .flatMap(g => g.fields)
      .find(f => f.formId === simple.formId && f.field.name === simple.field)
    if (!fieldOption) return null

    const comparators = COMPARATORS_BY_TYPE[fieldOption.field.type] || TEXT_COMPARATORS
    const opLabel = comparators.find(c => c.operator === simple.operator)?.display ?? simple.operator

    let displayVal = simple.value
    if (fieldOption.field.type === 'date' && simple.value) {
      displayVal = new Date(simple.value).toLocaleDateString()
    }

    const displayValue = NULL_OPERATORS.includes(simple.operator)
      ? `${fieldOption.field.title} ${opLabel}`
      : `${fieldOption.field.title} ${opLabel} ${displayVal}`

    return {
      field: fieldOption.field,
      formId: fieldOption.formId,
      formName: fieldOption.formName,
      formColor: fieldOption.formColor,
      operator: simple.operator,
      value: simple.value,
      displayValue,
      condition: simple
    }
  }

  private emitCondition(): void {
    const groups = this.conditionGroups
      .filter(g => g.conditions.length > 0)
      .map(group => {
        if (group.conditions.length === 1) {
          return group.conditions[0].condition
        }
        return { or: group.conditions.map(c => c.condition) }
      })

    let condition: Condition | undefined
    if (groups.length === 1) {
      condition = groups[0]
    } else if (groups.length > 1) {
      condition = { and: groups }
    }

    this.conditionChanged.emit(condition)
  }
}
