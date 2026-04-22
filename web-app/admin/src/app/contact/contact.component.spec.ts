import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ContactComponent } from './contact.component';
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('Contact Component', () => {

    let component: ContactComponent;
    let fixture: ComponentFixture<ContactComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
    declarations: [ContactComponent],
    imports: [MatDialogModule],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
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
