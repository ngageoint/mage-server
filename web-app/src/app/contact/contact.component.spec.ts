import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ContactComponent } from './contact.component';
import { MatDialogModule } from '@angular/material/dialog';

describe('Exports Component', () => {

    let component: ContactComponent;
    let fixture: ComponentFixture<ContactComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [MatDialogModule],
            declarations: [ContactComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ContactComponent);
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