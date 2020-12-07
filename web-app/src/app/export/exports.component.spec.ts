import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportsComponent } from './exports.component';
import { MatDialogModule } from '@angular/material';

describe('Exports Component', () => {

    let component: ExportsComponent;
    let fixture: ComponentFixture<ExportsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [MatDialogModule],
            declarations: [ExportsComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ExportsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeDefined();
    });

    it('should handle a null open property', () => {
        component.open = null;
        component.ngOnChanges(null);
        expect(component.dialog.openDialogs).toBeLessThanOrEqual(0);
    });

    it('should not open dialog if opened is false', () => {
        component.open = { opened: false };
        component.ngOnChanges(null);
        expect(component.dialog.openDialogs).toBeLessThanOrEqual(0);
    });
});