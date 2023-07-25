import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { Settings } from "src/app/upgrade/ajs-upgraded-providers";
import { ContactInfoComponent } from "./contact-info.component";
import { HttpClientTestingModule } from '@angular/common/http/testing';

class MockSettings {
    query(): any {
        return { $promise: Promise.resolve([]) };
    }
}

describe('Contact Info Tests', () => {
    let component: ContactInfoComponent;
    let fixture: ComponentFixture<ContactInfoComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, HttpClientTestingModule],
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