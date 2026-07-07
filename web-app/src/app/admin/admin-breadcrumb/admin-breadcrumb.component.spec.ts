import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AdminBreadcrumbComponent } from './admin-breadcrumb.component';
import { AdminBreadcrumb } from './admin-breadcrumb.model';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatIconModule } from '@angular/material/icon';
import { RouterTestingModule } from '@angular/router/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('AdminBreadcrumbComponent', () => {
  @Component({
    selector: 'app-host-component',
    template: `<admin-breadcrumb
      [breadcrumbs]="breadcrumbs"
    ></admin-breadcrumb>`,
    standalone: false
})
  class TestHostComponent {
    breadcrumbs: AdminBreadcrumb[];

    @ViewChild(AdminBreadcrumbComponent, { static: true })
    adminBreadcrumbComponent: AdminBreadcrumbComponent;
  }

  let hostComponent: TestHostComponent;
  let component: AdminBreadcrumbComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let element: HTMLElement;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MatIconTestingModule, MatIconModule, RouterTestingModule],
      declarations: [TestHostComponent, AdminBreadcrumbComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    component = hostComponent.adminBreadcrumbComponent;
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a single breadcrumb without separators', () => {
    component.breadcrumbs = [
      {
        title: 'Section',
        icon: 'map',
        route: ['/', 'admin', 'section']
      } as AdminBreadcrumb
    ];
    fixture.detectChanges();

    expect(element.querySelectorAll('.admin-breadcrumb').length).toEqual(1);
    expect(
      element.querySelectorAll('.admin-breadcrumb__separator').length
    ).toEqual(0);
  });

  it('should render multiple breadcrumbs with one active item', () => {
    component.breadcrumbs = [
      {
        title: 'First',
        icon: 'map',
        route: ['/', 'admin', 'first']
      } as AdminBreadcrumb,
      {
        title: 'Second',
        route: ['/', 'admin', 'second']
      } as AdminBreadcrumb,
      {
        title: 'Third',
        icon: 'map'
      } as AdminBreadcrumb
    ];
    fixture.detectChanges();

    const breadcrumbElements = element.querySelectorAll('.admin-breadcrumb');

    expect(breadcrumbElements.length).toEqual(3);
    expect(
      element.querySelectorAll('.admin-breadcrumb__separator').length
    ).toEqual(2);
    expect(
      element.querySelectorAll('.admin-breadcrumb--active').length
    ).toEqual(1);
    expect(element.querySelectorAll('mat-icon').length).toEqual(2);

    expect(breadcrumbElements.item(0).textContent.trim()).toEqual('First');
    expect(breadcrumbElements.item(1).textContent.trim()).toEqual('Second');
    expect(breadcrumbElements.item(2).textContent.trim()).toEqual('Third');
  });
});
