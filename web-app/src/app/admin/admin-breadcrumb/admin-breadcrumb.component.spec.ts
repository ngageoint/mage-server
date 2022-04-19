import { Component, ViewChild } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RawParams, StateOrName, StateService, TransitionOptions, TransitionPromise } from '@uirouter/angular';
import { AdminBreadcrumbComponent } from './admin-breadcrumb.component';
import { AdminBreadcrumb } from './admin-breadcrumb.model';
import { MatIconModule } from '@angular/material/icon';

class MockStateService {
  go(to: StateOrName, params?: RawParams, options?: TransitionOptions): TransitionPromise {
    return null;
  }
}

describe('AdminBreadcrumbComponent', () => {

  @Component({
    selector: 'app-host-component',
    template: `<admin-breadcrumb
                [breadcrumbs]="breadcrumbs">
               </admin-breadcrumb>`
  })
  class TestHostComponent {
    breadcrumbs: AdminBreadcrumb[];

    @ViewChild(AdminBreadcrumbComponent, { static: true })
    public adminBreadcrumbComponent: AdminBreadcrumbComponent;
  }

  let hostComponent: TestHostComponent;
  let component: AdminBreadcrumbComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let element: HTMLElement;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      providers: [{
        provide: StateService,
        useClass: MockStateService
      }],
      imports: [
        MatIconModule
      ],
      declarations: [
        TestHostComponent,
        AdminBreadcrumbComponent
      ]
    })
    .compileComponents();
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

  it('should call the state service with the breadcrumb parameters', () => {
    expect(component).toBeTruthy();
    const stateService: StateService = fixture.debugElement.injector.get(StateService);
    spyOn(stateService, 'go');

    const breadcrumb: AdminBreadcrumb = {
      title: 'Title',
      state: {
        name: 'name',
        params: {
          param1: 'toast'
        }
      }
    }
    component.goToBreadcrumb(breadcrumb);

    expect(stateService.go).toHaveBeenCalledWith('name', {param1: 'toast'})
  });

  it('should not call the state service if the breadcrumb has no state', () => {
    expect(component).toBeTruthy();
    const stateService: StateService = fixture.debugElement.injector.get(StateService);
    spyOn(stateService, 'go');

    const breadcrumb: AdminBreadcrumb = {
      title: 'Title'
    }
    component.goToBreadcrumb(breadcrumb);

    expect(stateService.go).not.toHaveBeenCalled();
  });

  it('should have one breadcrumb if passed in', () => {
    component.breadcrumbs = [{
      title: 'Title',
      icon: 'map',
      state: {
        name: 'name',
        params: {
          param1: 'toast'
        }
      }
    }]
    fixture.detectChanges();
    expect(element.querySelectorAll('.admin-breadcrumb').length).toEqual(1);
    expect(element.querySelectorAll('.admin-breadcrumb__separator').length).toEqual(0);

  });

  it('should have one active and two inactive breadcrumb', () => {
    component.breadcrumbs = [{
      title: 'Title',
      icon: 'map',
      state: {
        name: 'name',
        params: {
          param1: 'toast'
        }
      }
    }, {
      title: 'Title2',
      state: {
        name: 'name2',
        params: {
          param1: 'toast2'
        }
      }
    }, {
      title: 'Inactive',
      icon: 'map'
    }]
    fixture.detectChanges();
    const breadcrumbElements = element.querySelectorAll('.admin-breadcrumb');
    expect(breadcrumbElements.length).toEqual(3);
    expect(element.querySelectorAll('.admin-breadcrumb__separator').length).toEqual(2);
    expect(element.querySelectorAll('.admin-breadcrumb--active').length).toEqual(1);
    expect(element.querySelectorAll('mat-icon').length).toEqual(2);

    expect(breadcrumbElements.item(0).innerHTML).toEqual(component.breadcrumbs[0].title);
    expect(breadcrumbElements.item(1).innerHTML).toEqual(component.breadcrumbs[1].title);
    expect(breadcrumbElements.item(2).innerHTML).toEqual(component.breadcrumbs[2].title);
  });
});
