import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NoExportsComponent } from './no-exports.component';
import { MatDialogModule } from '@angular/material/dialog';

describe('NoExportsComponent', () => {

    let component: NoExportsComponent;
    let fixture: ComponentFixture<NoExportsComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [MatDialogModule],
            declarations: [NoExportsComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(NoExportsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeDefined();
    });
});
