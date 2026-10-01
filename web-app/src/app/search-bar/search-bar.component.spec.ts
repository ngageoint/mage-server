import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SearchBarComponent } from './search-bar.component';

describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [SearchBarComponent, BrowserAnimationsModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits the typed value after the debounce interval', fakeAsync(() => {
    const emitted: string[] = [];
    component.searchChange.subscribe(value => emitted.push(value));

    component.searchControl.setValue('flood');
    tick(299);
    expect(emitted).toEqual([]);

    tick(1);
    expect(emitted).toEqual(['flood']);
  }));

  it('does not emit again for the same value in a row', fakeAsync(() => {
    const emitted: string[] = [];
    component.searchChange.subscribe(value => emitted.push(value));

    component.searchControl.setValue('flood');
    tick(300);
    component.searchControl.setValue('flood');
    tick(300);

    expect(emitted).toEqual(['flood']);
  }));

  it('honors a custom debounceMs input', fakeAsync(() => {
    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('debounceMs', 100);
    fixture.detectChanges();

    const emitted: string[] = [];
    component.searchChange.subscribe(value => emitted.push(value));

    component.searchControl.setValue('storm');
    tick(100);

    expect(emitted).toEqual(['storm']);
  }));

  it('clears the control value', fakeAsync(() => {
    component.searchControl.setValue('flood');
    tick(300);

    component.clear();

    expect(component.searchControl.value).toBe('');
  }));

  it('emits an empty string immediately when cleared, without waiting for the debounce', fakeAsync(() => {
    component.searchControl.setValue('flood');
    tick(300);

    const emitted: string[] = [];
    component.searchChange.subscribe(value => emitted.push(value));

    component.clear();

    expect(emitted).toEqual(['']);
  }));

  it('sets the control value without emitting a search change', fakeAsync(() => {
    const emitted: string[] = [];
    component.searchChange.subscribe(value => emitted.push(value));

    component.setValue('wildfire');
    tick(300);

    expect(component.searchControl.value).toBe('wildfire');
    expect(emitted).toEqual([]);
  }));

  it('emits again when the same text is typed after the box was cleared', fakeAsync(() => {
    const emitted: string[] = [];
    component.searchChange.subscribe(value => emitted.push(value));

    component.searchControl.setValue('flood');
    tick(300);
    component.clear();
    component.searchControl.setValue('flood');
    tick(300);

    expect(emitted).toEqual(['flood', '', 'flood']);
  }));

  it('drops a typed value that is still waiting on the debounce when cleared', fakeAsync(() => {
    const emitted: string[] = [];
    component.searchChange.subscribe(value => emitted.push(value));

    component.searchControl.setValue('flood');
    tick(100);
    component.clear();
    tick(300);

    expect(emitted).toEqual([]);
    expect(component.searchControl.value).toBe('');
  }));

  it('keeps a trailing space the user typed when the same keyword is set from outside', fakeAsync(() => {
    component.searchControl.setValue('forest ');
    tick(300);

    component.setValue('forest');

    expect(component.searchControl.value).toBe('forest ');
  }));

  it('replaces the text when a different keyword is set from outside', fakeAsync(() => {
    component.searchControl.setValue('forest');
    tick(300);

    component.setValue('fire');

    expect(component.searchControl.value).toBe('fire');
  }));

  it('emits when the user retypes the previous text after an outside change', fakeAsync(() => {
    const emitted: string[] = [];
    component.searchChange.subscribe(value => emitted.push(value));
    component.searchControl.setValue('forest');
    tick(300);
    component.setValue('fire');
    tick(300);

    component.searchControl.setValue('forest');
    tick(300);

    expect(emitted).toEqual(['forest', 'forest']);
  }));

  it('stops emitting after the component is destroyed', fakeAsync(() => {
    const emitted: string[] = [];
    component.searchChange.subscribe(value => emitted.push(value));

    fixture.destroy();
    component.searchControl.setValue('flood');
    tick(300);

    expect(emitted).toEqual([]);
  }));
});
