import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core'
import { FormControl } from '@angular/forms'
import { MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete'
import { MatDatepicker, MatDatepickerInputEvent } from '@angular/material/datepicker'
import { Observable, Subject, map, startWith, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs'
import { ObservationFieldFilter, SimpleCondition } from '../../entities/observation/filter/entities.observation.filter'

type FilterType = 'keyword' | 'condition'
type ConditionState = 'field' | 'comparator' | 'value'

interface FieldOption {
  type: 'field'
  display: string
  field: any
  formId: number
  formName: string
  formColor: string
}

interface ComparatorOption {
  type: 'comparator'
  display: string
  operator: string
}

interface ValueOption {
  type: 'value'
  display: string
  value: any
}

type AutocompleteOption = FieldOption | ComparatorOption | ValueOption

interface FormGroup {
  formName: string
  fields: FieldOption[]
}

export interface FilterCondition {
  field: any
  formId: number
  formName: string
  formColor: string
  operator: string
  value?: any
  displayValue?: string
  condition: SimpleCondition
}

export interface FilterConditionGroup {
  conditions: FilterCondition[]
}

const EXCLUDED_FIELD_TYPES = ['attachment', 'geometry', 'hidden', 'password']

interface Comparator {
  operator: string
  display: string
}

const TEXT_COMPARATORS: Comparator[] = [
  { operator: '=', display: 'is' },
  { operator: '!=', display: 'is not' },
  { operator: 'LIKE', display: 'contains' },
  { operator: 'IS NULL', display: 'is empty' },
  { operator: 'IS NOT NULL', display: 'is not empty' },
]

const NUMBER_COMPARATORS: Comparator[] = [
  { operator: '=', display: 'is' },
  { operator: '!=', display: 'is not' },
  { operator: '>', display: '>' },
  { operator: '>=', display: '>=' },
  { operator: '<', display: '<' },
  { operator: '<=', display: '<=' },
  { operator: 'IS NULL', display: 'is empty' },
  { operator: 'IS NOT NULL', display: 'is not empty' },
]

const DATE_COMPARATORS: Comparator[] = NUMBER_COMPARATORS

const CHOICE_COMPARATORS: Comparator[] = [
  { operator: '=', display: 'is' },
  { operator: '!=', display: 'is not' },
  { operator: 'IS NULL', display: 'is empty' },
  { operator: 'IS NOT NULL', display: 'is not empty' },
]

const CHECKBOX_COMPARATORS: Comparator[] = [
  { operator: '=', display: 'is' },
  { operator: 'IS NULL', display: 'is empty' },
  { operator: 'IS NOT NULL', display: 'is not empty' },
]

const COMPARATORS_BY_TYPE: Record<string, Comparator[]> = {
  textfield: TEXT_COMPARATORS,
  textarea: TEXT_COMPARATORS,
  email: TEXT_COMPARATORS,
  numberfield: NUMBER_COMPARATORS,
  date: DATE_COMPARATORS,
  dropdown: CHOICE_COMPARATORS,
  radio: CHOICE_COMPARATORS,
  multiselectdropdown: CHOICE_COMPARATORS,
  checkbox: CHECKBOX_COMPARATORS,
}

const NULL_OPERATORS = ['IS NULL', 'IS NOT NULL']
const CHOICE_FIELD_TYPES = ['dropdown', 'multiselectdropdown', 'radio']

@Component({
  selector: 'observation-field-filter',
  templateUrl: './observation-field-filter.component.html',
  styleUrls: ['./observation-field-filter.component.scss'],
  standalone: false
})
export class ObservationFieldFilterComponent implements OnChanges, OnDestroy {
  @Input() forms: any[] = []
  @Input() filter: ObservationFieldFilter | null = null
  @Input() filterMode?: 'keyword' | 'condition'
  @Output() filterChanged = new EventEmitter<ObservationFieldFilter>()

  @ViewChild('filterInput') filterInput: ElementRef<HTMLInputElement>
  @ViewChild(MatAutocompleteTrigger) autoTrigger: MatAutocompleteTrigger
  @ViewChild('filterDatePicker') datePicker: MatDatepicker<any>

  filterType: FilterType = 'keyword'
  keywordControl = new FormControl('')
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
  private destroy$ = new Subject<void>()

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

  get hasPendingInput(): boolean {
    return this.filterType === 'condition' && this.conditionState !== 'field'
  }

  get inputPlaceholder(): string {
    switch (this.conditionState) {
      case 'field': return 'Search fields...'
      case 'comparator': return 'Select operator...'
      case 'value': return 'Enter value...'
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.forms) {
      this.buildFieldOptions()
      this.conditionGroups = []
      this.keywordControl.setValue('')
      this.resetState()
      this.setupKeywordSubscription()
    }

    if (changes.filterMode) {
      this.filterType = this.filterMode ?? 'keyword'
    }

    if (changes.filter) {
      this.populateFilter(this.filter)
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  toggleMode(): void {
    this.onModeChanged(this.filterType === 'keyword' ? 'condition' : 'keyword')
  }

  onModeChanged(mode: FilterType): void {
    this.filterType = mode
    if (mode === 'keyword') {
      this.conditionGroups = []
      this.resetState()
      this.filterChanged.emit({ keyword: this.keywordControl.value?.trim() || '' })
    } else {
      this.keywordControl.setValue('')
      this.emitConditions()
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
    if (value == null) return
    this.finalizeCondition(value)
  }

  addOr(): void {
    if (this.conditionState !== 'value') return
    if (this.isNullOperatorState) {
      this.finalizeCondition()
      return
    }
    const value = this.resolveValue()
    if (value == null) return
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
    if (value == null) return
    this.conditionGroups.push({ conditions: [] })
    this.finalizeCondition(value)
  }

  removeCondition(groupIndex: number, conditionIndex: number): void {
    const group = this.conditionGroups[groupIndex]
    group.conditions.splice(conditionIndex, 1)
    if (group.conditions.length === 0) {
      this.conditionGroups.splice(groupIndex, 1)
    }
    this.emitConditions()
  }

  private buildFieldOptions(): void {
    this.allFieldGroups = (this.forms || [])
      .filter(form => form.archived !== true)
      .map(form => {
        const fields = (form.fields || [])
          .filter((field: any) => field.archived !== true)
          .filter((field: any) => !EXCLUDED_FIELD_TYPES.includes(field.type))
          .map((field: any) => {
            return {
              type: 'field',
              display: field.title,
              field,
              formId: form.id,
              formName: form.name,
              formColor: form.color,
            }
          }
        )

        return { formName: form.name, fields }
      }
    )
    .filter(form => form.fields.length > 0)
  }

  private clearInput(): void {
    this.inputControl.setValue('', { emitEvent: false })
    if (this.filterInput) {
      this.filterInput.nativeElement.value = ''
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
            .map(value => ({ type: 'value', display: value, value: value === 'true'}))
        }
        if (CHOICE_FIELD_TYPES.includes(this.selectedField?.type) && this.selectedField?.choices) {
          return this.selectedField.choices
            .filter((choice: any) => !choice.blank && choice.title.toLowerCase().includes(q))
            .map((choice: any) => ({ type: 'value', display: choice.title, value: choice.title}))
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

    this.emitConditions()
    this.resetState()
  }

  private setupKeywordSubscription(): void {
    this.destroy$.next()
    this.keywordControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      if (this.filterType === 'keyword') {
        this.filterChanged.emit({ keyword: (value || '').trim() })
      }
    })
  }

  private populateFilter(filter: ObservationFieldFilter | null): void {
    if (!filter) return

    if (filter.keyword != null) {
      if (!this.filterMode || this.filterMode === 'keyword') {
        this.filterType = 'keyword'
        this.keywordControl.setValue(filter.keyword, { emitEvent: false })
      }
      return
    }

    if (filter.condition) {
      if (!this.filterMode || this.filterMode === 'condition') {
        this.filterType = 'condition'
        this.conditionGroups = this.conditionGroupsFromFilter(filter.condition)
      }
    }
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

  private emitConditions(): void {
    const groups = this.conditionGroups
      .filter(g => g.conditions.length > 0)
      .map(group => {
        if (group.conditions.length === 1) {
          return group.conditions[0].condition
        }
        return { or: group.conditions.map(c => c.condition) }
      })

    if (groups.length === 0) {
      this.filterChanged.emit({})
    } else if (groups.length === 1) {
      this.filterChanged.emit({ condition: groups[0] })
    } else {
      this.filterChanged.emit({ condition: { and: groups } })
    }
  }
}
