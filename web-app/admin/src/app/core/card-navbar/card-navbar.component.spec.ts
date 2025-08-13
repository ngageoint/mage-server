import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { CardNavbarComponent, CardActionButton } from './card-navbar.component';

describe('CardNavbarComponent', () => {
  let component: CardNavbarComponent;
  let fixture: ComponentFixture<CardNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CardNavbarComponent],
      imports: [FormsModule]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CardNavbarComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.title).toBeUndefined();
      expect(component.isSearchable).toBe(false);
      expect(component.searchPlaceholder).toBe('Search...');
      expect(component.actionButtons).toEqual([]);
      expect(component.debounceTime).toBe(250);
      expect(component.searchTerm).toBe('');
    });
  });

  describe('Template Rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display the title', () => {
      component.title = 'Test Title';
      fixture.detectChanges();

      const titleElement = fixture.debugElement.query(By.css('.navbar-brand'));
      expect(titleElement.nativeElement.textContent.trim()).toBe('Test Title');
    });

    it('should show search input when isSearchable is true', () => {
      component.isSearchable = true;
      fixture.detectChanges();

      const searchContainer = fixture.debugElement.query(By.css('.search-container'));
      const searchInput = fixture.debugElement.query(By.css('.search-input'));

      expect(searchContainer).toBeTruthy();
      expect(searchInput).toBeTruthy();
    });

    it('should hide search input when isSearchable is false', () => {
      component.isSearchable = false;
      fixture.detectChanges();

      const searchContainer = fixture.debugElement.query(By.css('.search-container'));
      expect(searchContainer).toBeFalsy();
    });

    it('should display custom search placeholder', () => {
      component.isSearchable = true;
      component.searchPlaceholder = 'Custom placeholder';
      fixture.detectChanges();

      const searchInput = fixture.debugElement.query(By.css('.search-input'));
      expect(searchInput.nativeElement.placeholder).toBe('Custom placeholder');
    });

    it('should display action buttons when provided', () => {
      const mockButtons: CardActionButton[] = [
        { label: 'Button 1', type: 'primary', action: jasmine.createSpy('action1') },
        { label: 'Button 2', type: 'secondary', action: jasmine.createSpy('action2') }
      ];
      component.actionButtons = mockButtons;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('.action-button'));
      expect(buttons.length).toBe(2);
      expect(buttons[0].nativeElement.textContent.trim()).toBe('Button 1');
      expect(buttons[1].nativeElement.textContent.trim()).toBe('Button 2');
    });

    it('should hide action buttons form when no buttons are provided', () => {
      component.actionButtons = [];
      fixture.detectChanges();

      const form = fixture.debugElement.query(By.css('.navbar-form.navbar-right'));
      expect(form).toBeFalsy();
    });

    it('should apply correct CSS classes to action buttons', () => {
      const mockButtons: CardActionButton[] = [
        { label: 'Primary', type: 'primary', action: jasmine.createSpy() },
        { label: 'Secondary', type: 'secondary', action: jasmine.createSpy() },
        { label: 'Tertiary', type: 'tertiary', action: jasmine.createSpy() }
      ];
      component.actionButtons = mockButtons;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('.action-button'));
      expect(buttons[0].nativeElement.classList).toContain('primary');
      expect(buttons[1].nativeElement.classList).toContain('secondary');
      expect(buttons[2].nativeElement.classList).toContain('tertiary');
    });

    it('should disable buttons when disabled property is true', () => {
      const mockButtons: CardActionButton[] = [
        { label: 'Enabled', type: 'primary', action: jasmine.createSpy() },
        { label: 'Disabled', type: 'primary', disabled: true, action: jasmine.createSpy() }
      ];
      component.actionButtons = mockButtons;
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('.action-button'));
      expect(buttons[0].nativeElement.disabled).toBe(false);
      expect(buttons[1].nativeElement.disabled).toBe(true);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      component.isSearchable = true;
      fixture.detectChanges();
    });

    it('should emit searchTermChanged when search term changes', fakeAsync(() => {
      spyOn(component.searchTermChanged, 'emit');

      component.onSearchChange('test search');
      tick(250); // Wait for debounce

      expect(component.searchTermChanged.emit).toHaveBeenCalledWith('test search');
    }));

    it('should debounce search term changes', fakeAsync(() => {
      spyOn(component.searchTermChanged, 'emit');

      component.onSearchChange('t');
      component.onSearchChange('te');
      component.onSearchChange('test');
      tick(100); // Before debounce completes

      expect(component.searchTermChanged.emit).not.toHaveBeenCalled();

      tick(150); // Complete debounce
      expect(component.searchTermChanged.emit).toHaveBeenCalledTimes(1);
      expect(component.searchTermChanged.emit).toHaveBeenCalledWith('test');
    }));

    it('should not emit duplicate search terms', fakeAsync(() => {
      spyOn(component.searchTermChanged, 'emit');

      component.onSearchChange('test');
      tick(250);
      component.onSearchChange('test');
      tick(250);

      expect(component.searchTermChanged.emit).toHaveBeenCalledTimes(1);
    }));

    it('should update searchTerm property when onSearchChange is called', () => {
      component.onSearchChange('new search term');
      expect(component.searchTerm).toBe('new search term');
    });

    it('should clear search when clearSearch is called', () => {
      spyOn(component.searchCleared, 'emit');
      component.searchTerm = 'some search';

      component.clearSearch();

      expect(component.searchTerm).toBe('');
      expect(component.searchCleared.emit).toHaveBeenCalled();
    });

    it('should trigger clearSearch when clear button is clicked', () => {
      spyOn(component, 'clearSearch');

      const searchInput = fixture.debugElement.query(By.css('.search-input'));
      searchInput.nativeElement.value = 'test';
      searchInput.nativeElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const clearButton = fixture.debugElement.query(By.css('.clear-search-btn'));
      clearButton.nativeElement.click();

      expect(component.clearSearch).toHaveBeenCalled();
    });

    it('should trigger onSearchChange when input value changes', fakeAsync(() => {
      spyOn(component, 'onSearchChange');

      const searchInput = fixture.debugElement.query(By.css('.search-input'));
      searchInput.nativeElement.value = 'test input';
      searchInput.nativeElement.dispatchEvent(new Event('input'));

      fixture.detectChanges();
      tick();

      expect(component.onSearchChange).toHaveBeenCalledWith('test input');
    }));
  });

  describe('Action Button Functionality', () => {
    it('should call button action when onActionButtonClick is called', () => {
      const mockAction = jasmine.createSpy('mockAction');
      const button: CardActionButton = {
        label: 'Test Button',
        type: 'primary',
        action: mockAction
      };

      component.onActionButtonClick(button);

      expect(mockAction).toHaveBeenCalled();
    });

    it('should not throw error when button action is undefined', () => {
      const button: CardActionButton = {
        label: 'Test Button',
        type: 'primary',
        action: undefined as any
      };

      expect(() => component.onActionButtonClick(button)).not.toThrow();
    });

    it('should trigger onActionButtonClick when button is clicked', () => {
      const mockAction = jasmine.createSpy('mockAction');
      const mockButtons: CardActionButton[] = [
        { label: 'Test Button', type: 'primary', action: mockAction }
      ];
      component.actionButtons = mockButtons;
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('.action-button'));
      button.nativeElement.click();

      expect(mockAction).toHaveBeenCalled();
    });
  });

  describe('Lifecycle Methods', () => {
    it('should set up search subscription on ngOnInit', () => {
      spyOn(component.searchTermChanged, 'emit');

      component.ngOnInit();

      // Verify subscription is working
      component.onSearchChange('test');
      expect(component.searchTerm).toBe('test');
    });

    it('should clean up subscriptions on ngOnDestroy', () => {
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should stop emitting search changes after ngOnDestroy', fakeAsync(() => {
      spyOn(component.searchTermChanged, 'emit');
      component.ngOnInit();

      component.ngOnDestroy();
      component.onSearchChange('test after destroy');
      tick(250);

      expect(component.searchTermChanged.emit).not.toHaveBeenCalled();
    }));
  });

  describe('Input Properties', () => {
    it('should accept title input', () => {
      const testTitle = 'My Component Title';
      component.title = testTitle;
      expect(component.title).toBe(testTitle);
    });

    it('should accept isSearchable input', () => {
      component.isSearchable = true;
      expect(component.isSearchable).toBe(true);
    });

    it('should accept searchPlaceholder input', () => {
      const placeholder = 'Enter search term...';
      component.searchPlaceholder = placeholder;
      expect(component.searchPlaceholder).toBe(placeholder);
    });

    it('should accept actionButtons input', () => {
      const buttons: CardActionButton[] = [
        { label: 'Button', type: 'primary', action: () => { } }
      ];
      component.actionButtons = buttons;
      expect(component.actionButtons).toBe(buttons);
    });

    it('should accept debounceTime input', () => {
      component.debounceTime = 500;
      expect(component.debounceTime).toBe(500);
    });
  });

  describe('Output Events', () => {
    it('should have searchTermChanged output', () => {
      expect(component.searchTermChanged).toBeDefined();
    });

    it('should have searchCleared output', () => {
      expect(component.searchCleared).toBeDefined();
    });
  });
});
