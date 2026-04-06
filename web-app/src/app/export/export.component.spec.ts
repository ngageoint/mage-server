import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ExportComponent } from './export.component';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';

describe('ExportComponent', () => {

    let component: ExportComponent;
    let fixture: ComponentFixture<ExportComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [MatDialogModule],
            declarations: [ExportComponent]
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
});
