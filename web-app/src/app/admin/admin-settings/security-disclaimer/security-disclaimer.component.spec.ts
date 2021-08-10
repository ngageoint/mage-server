import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { Settings } from "src/app/upgrade/ajs-upgraded-providers";
import { SecurityDisclaimerComponent } from "./security-disclaimer.component";

class MockSettings {
    query(): any {
        return { $promise: Promise.resolve({}) };
    }
}

describe('SecurityDisclaimerComponent', () => {
    let component: SecurityDisclaimerComponent;
    let fixture: ComponentFixture<SecurityDisclaimerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule],
            providers: [
                { provide: Settings, useClass: MockSettings },
            ],
            declarations: [SecurityDisclaimerComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SecurityDisclaimerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
