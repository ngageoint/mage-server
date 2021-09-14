import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { Settings } from "src/app/upgrade/ajs-upgraded-providers";
import { ContactInfoComponent } from "./contact-info.component";

class MockSettings {
    query(): any {
        return { $promise: Promise.resolve([]) };
    }
}

describe('AdministratorComponent', () => {
    let component: ContactInfoComponent;
    let fixture: ComponentFixture<ContactInfoComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule],
            providers: [
                { provide: Settings, useClass: MockSettings },
            ],
            declarations: [ContactInfoComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ContactInfoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});