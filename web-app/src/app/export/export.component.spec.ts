import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ExportComponent, ViewState } from './export.component';

describe('ExportComponent', () => {

    let component: ExportComponent;
    let fixture: ComponentFixture<ExportComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [ExportComponent],
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                provideNoopAnimations()
            ],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ExportComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeDefined();
    });

    it('should switch to create view', () => {
        component.onCreate();
        expect(component.state.view).toEqual(ViewState.Create);
    });

    it('should switch back to list view', () => {
        component.onCreate();
        component.onCreateClose();
        expect(component.state.view).toEqual(ViewState.List);
    });
});
