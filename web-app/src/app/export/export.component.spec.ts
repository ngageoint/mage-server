import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportComponent } from './export.component';
import { MatDialogModule } from '@angular/material/dialog';

describe('ExportComponent', () => {

    let component: ExportComponent;
    let fixture: ComponentFixture<ExportComponent>;

    beforeEach(async(() => {
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