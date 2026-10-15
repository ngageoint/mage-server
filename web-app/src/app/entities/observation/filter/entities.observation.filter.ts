export type BinaryOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "LIKE"

export type ArrayOperator = "IN" | "NOT IN"

export type RangeOperator = "BETWEEN"

export type NullOperator = "IS NULL" | "IS NOT NULL"

export type BinaryCondition = {
  formId: number
  field: string
  operator: BinaryOperator
  value: string | number | boolean
}

export type ArrayCondition = {
  formId: number
  field: string
  operator: ArrayOperator
  value: (string | number | boolean)[]
}

export type RangeCondition = {
  formId: number
  field: string
  operator: RangeOperator
  value: [string | number, string | number]
}

export type NullCondition = {
  formId: number
  field: string
  operator: NullOperator
}

export type SimpleCondition =
  | BinaryCondition
  | ArrayCondition
  | RangeCondition
  | NullCondition

export type CompoundCondition =
  | { and: Condition[] }
  | { or: Condition[] }

export type Condition = SimpleCondition | CompoundCondition

export type ObservationFieldFilter = {
  condition?: Condition
  keyword?: string
}
