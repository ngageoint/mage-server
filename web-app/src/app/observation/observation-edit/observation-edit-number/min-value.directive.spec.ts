import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { MinValueDirective } from './min-value.directive';

@Component({
  selector: `host-component`,
  template: `<input type="number" name="number" [(ngModel)]="number" [minValue]="min" #model="ngModel">`
})
class TestHostComponent {
  number: number
  min: number

  @ViewChild(MinValueDirective) directive: MinValueDirective
}

describe('MinValidatorDirective', () => {
  let component: TestHostComponent
  let directive: MinValueDirective
  let fixture: ComponentFixture<TestHostComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [MinValueDirective, TestHostComponent]
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    component = fixture.componentInstance
    fixture.detectChanges();
    directive = component.directive
  })

  it('should create an instance', () => {
    expect(directive).toBeTruthy();
  });

  it('should be valid', async () => {
    component.min = 1
    component.number = 2
    fixture.detectChanges()

    await fixture.whenStable()

    const model = fixture.debugElement.query(By.css('input[name=number]')).references['model']

    expect(model.valid).toBeTruthy();
  });

  it('should be invalid', async () => {
    component.min = 2
    component.number = 1
    fixture.detectChanges()

    await fixture.whenStable()

    const model = fixture.debugElement.query(By.css('input[name=number]')).references['model']

    expect(model.valid).toBeFalsy();
  });
});
