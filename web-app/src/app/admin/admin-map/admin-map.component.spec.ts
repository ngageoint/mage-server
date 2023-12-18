import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminMapComponent } from './admin-map.component';
import { Component, ViewChild } from '@angular/core';
import { MatInput, MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  selector: `host-component`,
  template: `<mage-admin-map></mage-admin-map>`
})
class TestHostComponent {
  @ViewChild(AdminMapComponent) component: AdminMapComponent;
}

describe('AdminMapComponent', () => {
  let component: AdminMapComponent;
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [MatInputModule, MatSnackBarModule, HttpClientTestingModule, NoopAnimationsModule],
      declarations: [AdminMapComponent, TestHostComponent],
      schemas: []
    })
      .compileComponents()
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    hostComponent = fixture.componentInstance
    fixture.detectChanges();
    component = hostComponent.component
  })


  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error on invalid and touched', async () => {
    component.webSearchType = 'NOMINATIM'

    fixture.detectChanges()
    await fixture.whenStable()

    const webNominatimUrlInput = fixture.debugElement.query(By.directive(MatInput))
    expect(webNominatimUrlInput).not.toBeNull()
  })
});
