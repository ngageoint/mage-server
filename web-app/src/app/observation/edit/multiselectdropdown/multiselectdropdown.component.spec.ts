import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';

import { MultiSelectDropdownComponent } from './multiselectdropdown.component';
import { MatInputModule, MatAutocompleteModule, MatChipsModule, MatIconModule, MatFormFieldModule, MatChipInputEvent, MatAutocompleteSelectedEvent, MatOption } from '@angular/material';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('MultiselectdropdownComponent', () => {
  let component: MultiSelectDropdownComponent;
  let fixture: ComponentFixture<MultiSelectDropdownComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, BrowserAnimationsModule, ReactiveFormsModule, MatInputModule, MatAutocompleteModule, MatChipsModule, MatIconModule, MatFormFieldModule ],
      declarations: [ MultiSelectDropdownComponent ],
      schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MultiSelectDropdownComponent);
    component = fixture.componentInstance;
    component.field = {
      title: 'Colors',
      choices: [{
        title: 'red'
      }, {
        title: 'green'
      }, {
        title: 'blue'
      }]
    }

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select choice', () => {
    const event = {
      option: {
        value: 'red'
      }
    }

    // @ts-ignore
    component.selected(event);

    expect(component.field.value).toEqual(['red']);
  });

  it('should add choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red'
    }
    component.add(event);

    expect(component.field.value).toEqual(['red']);
  });

  it('should not add invalid choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'purple'
    }
    component.add(event);

    expect(component.field.value).toBeUndefined();
  });

  it('should not add duplicate choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red'
    }
    component.add(event);
    component.add(event);

    expect(component.field.value).toEqual(['red']);
  });

  it('should remove choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red'
    }
    component.add(event);
    component.remove('red');

    expect(component.field.value).toEqual([]);
  });

  it('should not remove non existing choice', () => {
    const event: MatChipInputEvent = {
      input: null,
      value: 'red'
    }
    component.add(event);
    component.remove('blue');

    expect(component.field.value).toEqual(['red']);
  });
});
