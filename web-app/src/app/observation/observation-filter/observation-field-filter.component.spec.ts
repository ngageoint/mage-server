import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ObservationFieldFilterComponent } from './observation-field-filter.component';
import { Condition, SimpleCondition } from '../../entities/observation/filter/entities.observation.filter';

const forms: any[] = [
  {
    id: 1,
    name: 'Form A',
    color: '#111111',
    archived: false,
    fields: [
      { id: 1, name: 'severity', title: 'Severity', type: 'textfield' },
      { id: 2, name: 'count', title: 'Count', type: 'numberfield' },
      { id: 3, name: 'reported', title: 'Reported', type: 'date' },
      { id: 4, name: 'verified', title: 'Verified', type: 'checkbox' },
      {
        id: 5, name: 'status', title: 'Status', type: 'dropdown',
        choices: [{ title: 'Open' }, { title: 'Closed' }, { title: '', blank: true }]
      },
      { id: 6, name: 'secret', title: 'Secret', type: 'password' },
      { id: 7, name: 'oldField', title: 'Old Field', type: 'textfield', archived: true },
    ]
  },
  {
    id: 2,
    name: 'Archived Form',
    color: '#222222',
    archived: true,
    fields: [
      { id: 8, name: 'ignored', title: 'Ignored', type: 'textfield' }
    ]
  }
];

function fieldOption(component: ObservationFieldFilterComponent, formId: number, fieldName: string) {
  return (component as any).allFieldGroups
    .flatMap((g: any) => g.fields)
    .find((f: any) => f.formId === formId && f.field.name === fieldName);
}

function selectField(component: ObservationFieldFilterComponent, formId: number, fieldName: string): void {
  component.onOptionSelected({ option: { value: fieldOption(component, formId, fieldName) } } as any);
}

function selectComparator(component: ObservationFieldFilterComponent, operator: string, display: string): void {
  component.onOptionSelected({ option: { value: { type: 'comparator', operator, display } } } as any);
}

function selectValueOption(component: ObservationFieldFilterComponent, value: any, display: string): void {
  component.onOptionSelected({ option: { value: { type: 'value', value, display } } } as any);
}

describe('ObservationFieldFilterComponent', () => {
  let component: ObservationFieldFilterComponent;
  let fixture: ComponentFixture<ObservationFieldFilterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ObservationFieldFilterComponent, MatMomentDateModule, BrowserAnimationsModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationFieldFilterComponent);
    component = fixture.componentInstance;
  });

  function setForms(): void {
    component.forms = forms;
    component.ngOnChanges({ forms: new SimpleChange(null, forms, true) });
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnChanges - forms', () => {
    it('builds field groups excluding archived forms, archived fields, and excluded field types', () => {
      setForms();

      const groups = (component as any).allFieldGroups;
      expect(groups.length).toBe(1);
      expect(groups[0].formName).toBe('Form A');

      const fieldNames = groups[0].fields.map((f: any) => f.field.name);
      expect(fieldNames).toEqual(['severity', 'count', 'reported', 'verified', 'status']);
    });

    it('resets condition groups and builder state', () => {
      setForms();
      selectField(component, 1, 'severity');
      expect(component.conditionState).toBe('comparator');

      setForms();

      expect(component.conditionState).toBe('field');
      expect(component.conditionGroups).toEqual([]);
    });
  });

  describe('ngOnChanges - condition', () => {
    it('populates a single simple condition', () => {
      setForms();
      const condition: SimpleCondition = { formId: 1, field: 'severity', operator: '=', value: 'high' };

      component.condition = condition;
      component.ngOnChanges({ condition: new SimpleChange(null, condition, true) });

      expect(component.conditionGroups.length).toBe(1);
      expect(component.conditionGroups[0].conditions.length).toBe(1);
      expect(component.conditionGroups[0].conditions[0].displayValue).toBe('Severity is high');
    });

    it('populates an "or" node as a single group with multiple conditions', () => {
      setForms();
      const condition: Condition = {
        or: [
          { formId: 1, field: 'severity', operator: '=', value: 'high' },
          { formId: 1, field: 'severity', operator: '=', value: 'medium' }
        ]
      };

      component.condition = condition;
      component.ngOnChanges({ condition: new SimpleChange(null, condition, true) });

      expect(component.conditionGroups.length).toBe(1);
      expect(component.conditionGroups[0].conditions.length).toBe(2);
    });

    it('populates an "and" node as multiple groups', () => {
      setForms();
      const condition: Condition = {
        and: [
          { formId: 1, field: 'severity', operator: '=', value: 'high' },
          { formId: 1, field: 'count', operator: '>', value: 5 }
        ]
      };

      component.condition = condition;
      component.ngOnChanges({ condition: new SimpleChange(null, condition, true) });

      expect(component.conditionGroups.length).toBe(2);
      expect(component.conditionGroups[0].conditions.length).toBe(1);
      expect(component.conditionGroups[1].conditions.length).toBe(1);
    });

    it('drops a condition referencing a field that no longer exists in the current forms', () => {
      setForms();
      const condition: SimpleCondition = { formId: 1, field: 'doesNotExist', operator: '=', value: 'x' };

      component.condition = condition;
      component.ngOnChanges({ condition: new SimpleChange(null, condition, true) });

      expect(component.conditionGroups).toEqual([{ conditions: [] }]);
    });

    it('does nothing when the condition is null', () => {
      setForms();
      component.condition = null;
      component.ngOnChanges({ condition: new SimpleChange(null, null, true) });

      expect(component.conditionGroups).toEqual([]);
    });
  });

  describe('field/comparator/value selection', () => {
    beforeEach(() => setForms());

    it('selecting a field moves to the comparator state', () => {
      selectField(component, 1, 'severity');

      expect(component.conditionState).toBe('comparator');
      expect(component.selectedField.name).toBe('severity');
      expect(component.selectedFormId).toBe(1);
      expect(component.selectedFormName).toBe('Form A');
    });

    it('selecting a non-null comparator moves to the value state', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');

      expect(component.conditionState).toBe('value');
      expect(component.selectedOperator).toBe('=');
      expect(component.isNullOperatorState).toBeFalse();
    });

    it('selecting a null-check comparator moves to the value state with hasValue already true', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, 'IS NULL', 'is empty');

      expect(component.conditionState).toBe('value');
      expect(component.isNullOperatorState).toBeTrue();
      expect(component.hasValue).toBeTrue();
    });

    it('selecting a value option sets the pending value without leaving the value state', () => {
      selectField(component, 1, 'status');
      selectComparator(component, '=', 'is');
      selectValueOption(component, 'Open', 'Open');

      expect(component.conditionState).toBe('value');
      expect(component.pendingValue).toBe('Open');
      expect(component.pendingValueDisplay).toBe('Open');
    });
  });

  describe('onInputKeydown', () => {
    beforeEach(() => setForms());

    it('Enter finalizes the current condition and returns to the field state', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');

      component.onInputKeydown({ key: 'Enter' } as KeyboardEvent);

      expect(component.conditionState).toBe('field');
      expect(component.conditionGroups.length).toBe(1);
      expect(component.conditionGroups[0].conditions[0].condition).toEqual({ formId: 1, field: 'severity', operator: '=', value: 'high' });
    });

    it('Enter with no value does nothing', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');

      component.onInputKeydown({ key: 'Enter' } as KeyboardEvent);

      expect(component.conditionState).toBe('value');
      expect(component.conditionGroups).toEqual([]);
    });

    it('Backspace on empty input in the value state removes the operator chip', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');

      component.onInputKeydown({ key: 'Backspace' } as KeyboardEvent);

      expect(component.conditionState).toBe('comparator');
      expect(component.selectedOperator).toBeNull();
      expect(component.selectedField.name).toBe('severity');
    });

    it('Backspace on empty input in the comparator state removes the field chip', () => {
      selectField(component, 1, 'severity');

      component.onInputKeydown({ key: 'Backspace' } as KeyboardEvent);

      expect(component.conditionState).toBe('field');
      expect(component.selectedField).toBeNull();
    });

    it('Backspace with non-empty input does nothing', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');

      component.onInputKeydown({ key: 'Backspace' } as KeyboardEvent);

      expect(component.conditionState).toBe('value');
      expect(component.selectedOperator).toBe('=');
    });
  });

  describe('addOr / addAnd', () => {
    beforeEach(() => setForms());

    it('addOr adds a second condition to the same group', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');
      component.addOr();

      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('medium');
      component.addOr();

      expect(component.conditionGroups.length).toBe(1);
      expect(component.conditionGroups[0].conditions.length).toBe(2);
    });

    it('addAnd starts a new group', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');
      component.addAnd();

      selectField(component, 1, 'count');
      selectComparator(component, '>', '>');
      component.inputControl.setValue('5');
      component.addAnd();

      expect(component.conditionGroups.length).toBe(2);
      expect(component.conditionGroups[0].conditions.length).toBe(1);
      expect(component.conditionGroups[1].conditions.length).toBe(1);
    });

    it('addOr/addAnd on a null-check comparator finalizes without a value', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, 'IS NULL', 'is empty');

      component.addOr();

      expect(component.conditionGroups[0].conditions[0].condition).toEqual({ formId: 1, field: 'severity', operator: 'IS NULL' });
    });

    it('addOr does nothing outside the value state', () => {
      selectField(component, 1, 'severity');
      component.addOr();
      expect(component.conditionGroups).toEqual([]);
    });
  });

  describe('emitted condition shape', () => {
    let emitted: (Condition | undefined)[];

    beforeEach(() => {
      setForms();
      emitted = [];
      component.conditionChanged.subscribe(c => emitted.push(c));
    });

    it('emits the raw simple condition for a single condition', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');
      component.addOr();

      expect(emitted[emitted.length - 1]).toEqual({ formId: 1, field: 'severity', operator: '=', value: 'high' });
    });

    it('emits an "or" node for multiple conditions in the same group', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');
      component.addOr();

      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('medium');
      component.addOr();

      expect(emitted[emitted.length - 1]).toEqual({
        or: [
          { formId: 1, field: 'severity', operator: '=', value: 'high' },
          { formId: 1, field: 'severity', operator: '=', value: 'medium' }
        ]
      });
    });

    it('emits an "and" node for multiple groups', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');
      component.addAnd();

      selectField(component, 1, 'count');
      selectComparator(component, '>', '>');
      component.inputControl.setValue('5');
      component.addAnd();

      expect(emitted[emitted.length - 1]).toEqual({
        and: [
          { formId: 1, field: 'severity', operator: '=', value: 'high' },
          { formId: 1, field: 'count', operator: '>', value: 5 }
        ]
      });
    });

    it('emits undefined once the last condition is removed', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');
      component.addOr();

      component.removeCondition(0, 0);

      expect(emitted[emitted.length - 1]).toBeUndefined();
      expect(component.conditionGroups).toEqual([]);
    });
  });

  describe('removeCondition', () => {
    beforeEach(() => setForms());

    it('removes a single condition and its now-empty group', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');
      component.addAnd();

      selectField(component, 1, 'count');
      selectComparator(component, '>', '>');
      component.inputControl.setValue('5');
      component.addOr();

      component.removeCondition(0, 0);

      expect(component.conditionGroups.length).toBe(1);
      expect(component.conditionGroups[0].conditions[0].field.name).toBe('count');
    });

    it('removes one condition from a group without removing the group', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');
      component.addOr();

      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('medium');
      component.addOr();

      component.removeCondition(0, 0);

      expect(component.conditionGroups.length).toBe(1);
      expect(component.conditionGroups[0].conditions.length).toBe(1);
      expect((component.conditionGroups[0].conditions[0].condition as any).value).toBe('medium');
    });
  });

  describe('clear', () => {
    beforeEach(() => setForms());

    it('removes every condition without emitting a change', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');
      component.addOr();
      const emitted: any[] = [];
      component.conditionChanged.subscribe(condition => emitted.push(condition));

      component.clear();

      expect(component.conditionGroups).toEqual([]);
      expect(emitted).toEqual([]);
    });

    it('abandons a condition that was still being built', () => {
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');

      component.clear();

      expect(component.conditionState).toBe('field');
      expect(component.selectedField).toBeNull();
    });
  });

  describe('numberfield value parsing', () => {
    beforeEach(() => setForms());

    it('parses valid numeric text to a number', () => {
      selectField(component, 1, 'count');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('5');
      component.addOr();

      expect((component.conditionGroups[0].conditions[0].condition as any).value).toBe(5);
    });

    it('leaves Add enabled for unparseable text, but shows an error and does not finalize once clicked', () => {
      selectField(component, 1, 'count');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('not-a-number');

      expect(component.hasValue).toBeTrue();
      expect(component.showInvalidNumberError).toBeFalse();

      component.addOr();

      expect(component.showInvalidNumberError).toBeTrue();
      expect(component.conditionState).toBe('value');
      expect(component.conditionGroups).toEqual([]);
    });

    it('clears the error once the field/operator/value chips are reset', () => {
      selectField(component, 1, 'count');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('not-a-number');
      component.addOr();
      expect(component.showInvalidNumberError).toBeTrue();

      component.removeOperatorChip();

      expect(component.showInvalidNumberError).toBeFalse();
    });
  });

  describe('getters', () => {
    beforeEach(() => setForms());

    it('hasIncompleteCondition is true once a field is selected and false once reset', () => {
      expect(component.hasIncompleteCondition).toBeFalse();
      selectField(component, 1, 'severity');
      expect(component.hasIncompleteCondition).toBeTrue();
    });

    it('inputPlaceholder reflects the current state', () => {
      expect(component.inputPlaceholder).toBe('Add Condition...');
      selectField(component, 1, 'severity');
      expect(component.inputPlaceholder).toBe('Select operator...');
      selectComparator(component, '=', 'is');
      expect(component.inputPlaceholder).toBe('Enter value...');
    });

    it('hasConditions reflects whether any group has conditions', () => {
      expect(component.hasConditions).toBeFalse();
      selectField(component, 1, 'severity');
      selectComparator(component, '=', 'is');
      component.inputControl.setValue('high');
      component.addOr();
      expect(component.hasConditions).toBeTrue();
    });
  });
});
