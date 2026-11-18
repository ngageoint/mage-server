import { SimpleCondition } from '../../entities/observation/filter/entities.observation.filter'

export type ConditionState = 'field' | 'comparator' | 'value'

export interface FieldOption {
  type: 'field'
  display: string
  field: any
  formId: number
  formName: string
  formColor: string
}

export interface ComparatorOption {
  type: 'comparator'
  display: string
  operator: string
}

export interface ValueOption {
  type: 'value'
  display: string
  value: any
}

export type AutocompleteOption = FieldOption | ComparatorOption | ValueOption

export interface FormGroup {
  formName: string
  formColor: string
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

export const EXCLUDED_FIELD_TYPES = ['attachment', 'geometry', 'hidden', 'password']

export interface Comparator {
  operator: string
  display: string
}

export const TEXT_COMPARATORS: Comparator[] = [
  { operator: '=', display: 'is' },
  { operator: '!=', display: 'is not' },
  { operator: 'LIKE', display: 'contains' },
  { operator: 'IS NULL', display: 'is empty' },
  { operator: 'IS NOT NULL', display: 'is not empty' },
]

export const NUMBER_COMPARATORS: Comparator[] = [
  { operator: '=', display: 'is' },
  { operator: '!=', display: 'is not' },
  { operator: '>', display: '>' },
  { operator: '>=', display: '>=' },
  { operator: '<', display: '<' },
  { operator: '<=', display: '<=' },
  { operator: 'IS NULL', display: 'is empty' },
  { operator: 'IS NOT NULL', display: 'is not empty' },
]

export const DATE_COMPARATORS: Comparator[] = NUMBER_COMPARATORS

export const CHOICE_COMPARATORS: Comparator[] = [
  { operator: '=', display: 'is' },
  { operator: '!=', display: 'is not' },
  { operator: 'IS NULL', display: 'is empty' },
  { operator: 'IS NOT NULL', display: 'is not empty' },
]

export const CHECKBOX_COMPARATORS: Comparator[] = [
  { operator: '=', display: 'is' },
  { operator: 'IS NULL', display: 'is empty' },
  { operator: 'IS NOT NULL', display: 'is not empty' },
]

export const COMPARATORS_BY_TYPE: Record<string, Comparator[]> = {
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

export const NULL_OPERATORS = ['IS NULL', 'IS NOT NULL']
export const CHOICE_FIELD_TYPES = ['dropdown', 'multiselectdropdown', 'radio']

export function buildFieldGroups(forms: any[]): FormGroup[] {
  return (forms || [])
    .filter(form => form.archived !== true)
    .map(form => {
      const fields: FieldOption[] = (form.fields || [])
        .filter((field: any) => field.archived !== true)
        .filter((field: any) => !EXCLUDED_FIELD_TYPES.includes(field.type))
        .map((field: any) => ({
          type: 'field' as const,
          display: field.title,
          field,
          formId: form.id,
          formName: form.name,
          formColor: form.color,
        }))

      return { formName: form.name, formColor: form.color, fields }
    })
    .filter(group => group.fields.length > 0)
}
