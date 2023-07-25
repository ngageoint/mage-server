import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { Settings } from "src/app/upgrade/ajs-upgraded-providers";
import { SecurityBannerComponent } from "./security-banner.component";

class MockSettings {
    query(): any {
        return { $promise: Promise.resolve({}) };
    }
}

describe('SecurityBannerComponent', () => {
    let component: SecurityBannerComponent;
    let fixture: ComponentFixture<SecurityBannerComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule],
            providers: [
                { provide: Settings, useClass: MockSettings },
            ],
            declarations: [SecurityBannerComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SecurityBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
