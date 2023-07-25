import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';

import { AdminEventFormPreviewComponent } from './admin-event-form-preview.component';

@Component({
  template: '<admin-event-form-preview [formDefinition]="formDefinition"></admin-event-form-preview>'
})
class TestHostComponent {
  formDefinition: any

  @ViewChild(AdminEventFormPreviewComponent, { static: true })
  public adminEventFormPreviewComponent: AdminEventFormPreviewComponent
}

class MatDialogMock {
  open(): any {
    return {
      afterClosed: (): Observable<boolean> => of(true)
    }
  }
}

describe('AdminEventFormPreviewComponent', () => {
  let component: AdminEventFormPreviewComponent
  let hostComponent: TestHostComponent
  let fixture: ComponentFixture<TestHostComponent>
  let dialog: MatDialog

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, MatDialogModule],
      declarations: [AdminEventFormPreviewComponent, TestHostComponent],
      providers: [{
        provide: MatDialog, useClass: MatDialogMock
      }]
    })
    .compileComponents()
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent)
    hostComponent = fixture.componentInstance
    component = hostComponent.adminEventFormPreviewComponent
    dialog = TestBed.inject(MatDialog)
    fixture.detectChanges()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open dialog', () => {
    spyOn(dialog, 'open').and.callThrough()

    hostComponent.formDefinition = {
      fields: []
    }

    fixture.detectChanges()

    expect(dialog.open).toHaveBeenCalled()
  });

  it('should close dialog', async(async () => {
    spyOn(component.onClose, 'emit')
    spyOn(component.dialog, 'open').and.callThrough()

    hostComponent.formDefinition = {
      name: 'Mock Form 1',
      fields: []
    }

    fixture.detectChanges()

    expect(dialog.open).toHaveBeenCalled()
    expect(component.onClose.emit).toHaveBeenCalled()
  }));
});
