import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';

import { DropdownComponent } from './dropdown.component';
import { By } from '@angular/platform-browser';

@Component({
  template: `<observation-edit-dropdown [field]="field"></observation-edit-dropdown>`
})
class TestHostComponent {
  field = {
    title: 'Colors',
    choices: [{
      title: 'red'
    },{
      title: 'green'
    },{
      title: 'blue'
    }]
  }
}

describe('DropdownComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DropdownComponent, TestHostComponent],
      schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.debugElement.query(By.directive(DropdownComponent))).toBeTruthy();
  });
});
