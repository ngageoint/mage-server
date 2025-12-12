import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SearchModalComponent, SearchModalData, SearchModalResult } from './search-modal.component';

@Component({
    selector: 'mage-card-navbar',
    template: '<div>Mock Card Navbar</div>'
})
class MockCardNavbarComponent {
    @Input() title?: string;
    @Input() isSearchable = false;
    @Input() searchPlaceholder = 'Search...';
    @Output() searchTermChanged = new EventEmitter<string>();
    @Output() searchCleared = new EventEmitter<void>();
}

describe('SearchModalComponent', () => {
    let component: SearchModalComponent;
    let fixture: ComponentFixture<SearchModalComponent>;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<SearchModalComponent>>;
    let mockSearchFunction: jasmine.Spy;

    const mockSearchData: SearchModalData = {
        title: 'Test Search Modal',
        searchPlaceholder: 'Search for items...',
        teamId: 'team-123',
        searchFunction: jasmine.createSpy('searchFunction'),
        columns: [
            {
                key: 'name',
                label: 'Name',
                displayFunction: (item: any) => item.name,
                width: '200px'
            },
            {
                key: 'email',
                label: 'Email',
                displayFunction: (item: any) => item.email
            }
        ],
        selectedItem: null
    };

    const mockSearchResults = {
        items: [
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
            { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
        ]
    };

    beforeEach(async () => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        mockSearchFunction = jasmine.createSpy('searchFunction').and.returnValue(of(mockSearchResults));
        mockSearchData.searchFunction = mockSearchFunction;

        await TestBed.configureTestingModule({
            declarations: [
                SearchModalComponent,
                MockCardNavbarComponent
            ],
            imports: [
                MatTableModule,
                MatPaginatorModule,
                MatIconModule,
                MatButtonModule,
                NoopAnimationsModule
            ],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: mockSearchData }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SearchModalComponent);
        component = fixture.componentInstance;
    });

    describe('Component Initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should initialize with correct data', () => {
            expect(component.data).toEqual(mockSearchData);
            expect(component.columns).toEqual(mockSearchData.columns);
            expect(component.displayedColumns).toEqual(['name', 'email']);
            expect(component.selectedItem).toBeNull();
        });

        it('should initialize with default values', () => {
            expect(component.loading).toBeFalse();
            expect(component.pageIndex).toBe(0);
            expect(component.pageSize).toBe(5);
            expect(component.totalCount).toBe(0);
            expect(component.pageSizeOptions).toEqual([5]);
            expect(component.currentSearchTerm).toBe('');
        });

        it('should call search on init', () => {
            spyOn(component, 'search');
            component.ngOnInit();
            expect(component.search).toHaveBeenCalled();
        });
    });

    describe('Search Functionality', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should perform search with correct parameters', () => {
            component.currentSearchTerm = 'test';
            component.pageIndex = 1;
            component.pageSize = 10;

            component.search();

            expect(mockSearchFunction).toHaveBeenCalledWith('test', 1, 10);
        });

        it('should perform search with empty string when no search term', () => {
            component.currentSearchTerm = '';
            component.search();

            expect(mockSearchFunction).toHaveBeenCalledWith('', 0, 5);
        });

        it('should update data source and total count on successful search', () => {
            component.search();

            expect(component.dataSource.data).toEqual(mockSearchResults.items);
            expect(component.totalCount).toBe(3);
            expect(component.loading).toBeFalse();
        });

        it('should handle search results without items property', () => {
            mockSearchFunction.and.returnValue(of(mockSearchResults.items));

            component.search();

            expect(component.dataSource.data).toEqual(mockSearchResults.items);
            expect(component.totalCount).toBe(3);
        });

        it('should handle search error', () => {
            const consoleErrorSpy = spyOn(console, 'error');
            mockSearchFunction.and.returnValue(throwError('Search failed'));

            component.search();

            expect(component.loading).toBeFalse();
            expect(component.dataSource.data).toEqual([]);
            expect(component.totalCount).toBe(0);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Search error:', 'Search failed');
        });

        it('should set loading to true during search', () => {
            component.search();
            expect(component.loading).toBeFalse(); // Should be false after synchronous test completion
        });
    });

    describe('Search Term Handling', () => {
        beforeEach(() => {
            fixture.detectChanges();
            spyOn(component, 'search');
        });

        it('should update search term and trigger search on search term changed', () => {
            component.onSearchTermChanged('new search');

            expect(component.currentSearchTerm).toBe('new search');
            expect(component.pageIndex).toBe(0);
            expect(component.search).toHaveBeenCalled();
        });

        it('should clear search term and trigger search on search cleared', () => {
            component.currentSearchTerm = 'existing search';
            component.pageIndex = 2;

            component.onSearchCleared();

            expect(component.currentSearchTerm).toBe('');
            expect(component.pageIndex).toBe(0);
            expect(component.search).toHaveBeenCalled();
        });
    });

    describe('Pagination', () => {
        beforeEach(() => {
            fixture.detectChanges();
            spyOn(component, 'search');
        });

        it('should update page index and trigger search on page change', () => {
            const pageEvent: PageEvent = {
                pageIndex: 2,
                pageSize: 5,
                length: 20,
                previousPageIndex: 1
            };

            component.onPageChange(pageEvent);

            expect(component.pageIndex).toBe(2);
            expect(component.search).toHaveBeenCalled();
        });
    });

    describe('Item Selection', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should check if item is selected correctly', () => {
            const item = mockSearchResults.items[0];
            component.selectedItem = item;

            expect(component.isSelected(item)).toBeTrue();
            expect(component.isSelected(mockSearchResults.items[1])).toBeFalse();
        });

        it('should disable submit button when no item is selected', () => {
            component.selectedItem = null;
            fixture.detectChanges();

            const confirmButton = fixture.debugElement.nativeElement.querySelector('[data-testid="confirm-button"]');
            expect(confirmButton.disabled).toBeTrue();
        });

        it('should toggle selection - select item when none selected', () => {
            const item = mockSearchResults.items[0];
            component.selectedItem = null;

            component.toggleSelection(item);

            expect(component.selectedItem).toBe(item);
        });

        it('should toggle selection - deselect item when already selected', () => {
            const item = mockSearchResults.items[0];
            component.selectedItem = item;

            component.toggleSelection(item);

            expect(component.selectedItem).toBeNull();
        });

        it('should toggle selection - select different item when another is selected', () => {
            const item1 = mockSearchResults.items[0];
            const item2 = mockSearchResults.items[1];
            component.selectedItem = item1;

            component.toggleSelection(item2);

            expect(component.selectedItem).toBe(item2);
        });

        it('should handle row click and prevent default', () => {
            const item = mockSearchResults.items[0];
            const mockEvent = jasmine.createSpyObj('MouseEvent', ['preventDefault']);
            spyOn(component, 'toggleSelection');

            component.onRowClick(item, mockEvent);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(component.toggleSelection).toHaveBeenCalledWith(item);
        });
    });

    describe('Item Comparison', () => {
        it('should compare items by id when both have ids', () => {
            const item1 = { id: 1, name: 'John' };
            const item2 = { id: 1, name: 'Different Name' };
            const item3 = { id: 2, name: 'Jane' };

            component.selectedItem = item1;

            expect(component.isSelected(item2)).toBeTrue(); // Same id
            expect(component.isSelected(item3)).toBeFalse(); // Different id
        });

        it('should compare items by reference when no ids', () => {
            const item1 = { name: 'John' };
            const item2 = { name: 'John' };

            component.selectedItem = item1;

            expect(component.isSelected(item1)).toBeTrue(); // Same reference
            expect(component.isSelected(item2)).toBeFalse(); // Different reference
        });
    });

    describe('Column Utilities', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should get column value using display function', () => {
            const item = mockSearchResults.items[0];
            const column = mockSearchData.columns[0];

            const value = component.getColumnValue(item, column);

            expect(value).toBe('John Doe');
        });

        it('should find column by key', () => {
            const column = component.getColumnByKey('name');

            expect(column).toBe(mockSearchData.columns[0]);
            expect(column?.label).toBe('Name');
        });

        it('should return undefined for non-existent column key', () => {
            const column = component.getColumnByKey('nonexistent');

            expect(column).toBeUndefined();
        });
    });

    describe('Selection Count', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should return 1 when item is selected', () => {
            component.selectedItem = mockSearchResults.items[0];

            expect(component.getSelectedCount()).toBe(1);
        });

        it('should return 0 when no item is selected', () => {
            component.selectedItem = null;

            expect(component.getSelectedCount()).toBe(0);
        });
    });

    describe('Modal Actions', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should close dialog with selected item on confirm', () => {
            const selectedItem = mockSearchResults.items[0];
            component.selectedItem = selectedItem;

            component.onConfirm();

            const expectedResult: SearchModalResult = {
                selectedItem: selectedItem
            };
            expect(mockDialogRef.close).toHaveBeenCalledWith(expectedResult);
        });

        it('should close dialog with null selected item when none selected', () => {
            component.selectedItem = null;

            component.onConfirm();

            const expectedResult: SearchModalResult = {
                selectedItem: null
            };
            expect(mockDialogRef.close).toHaveBeenCalledWith(expectedResult);
        });
    });

    describe('Component Destruction', () => {
        it('should complete destroy subject on destroy', () => {
            const destroySpy = spyOn(component['destroy$'], 'next');
            const completeSpy = spyOn(component['destroy$'], 'complete');

            component.ngOnDestroy();

            expect(destroySpy).toHaveBeenCalled();
            expect(completeSpy).toHaveBeenCalled();
        });
    });

    describe('Template Integration', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should display title in card navbar', () => {
            const cardNavbar = fixture.debugElement.query(directive => directive.name === 'mage-card-navbar');
            expect(cardNavbar).toBeTruthy();
        });

        it('should display table with correct columns', () => {
            const table = fixture.debugElement.nativeElement.querySelector('[data-testid="search-results-table"]');
            expect(table).toBeTruthy();
        });

        it('should show no results message when no data', () => {
            component.dataSource.data = [];
            fixture.detectChanges();

            const noResults = fixture.debugElement.nativeElement.querySelector('[data-testid="no-results"]');
            expect(noResults).toBeTruthy();
            expect(noResults.textContent.trim()).toBe('No results found');
        });

        it('should show paginator when totalCount > 0', () => {
            component.totalCount = 10;
            fixture.detectChanges();

            const paginator = fixture.debugElement.nativeElement.querySelector('[data-testid="paginator"]');
            expect(paginator).toBeTruthy();
        });

        it('should disable confirm button when no selection', () => {
            component.selectedItem = null;
            fixture.detectChanges();

            const confirmButton = fixture.debugElement.nativeElement.querySelector('[data-testid="confirm-button"]');
            expect(confirmButton.disabled).toBeTrue();
        });

        it('should enable confirm button when item is selected', () => {
            component.selectedItem = mockSearchResults.items[0];
            fixture.detectChanges();

            const confirmButton = fixture.debugElement.nativeElement.querySelector('[data-testid="confirm-button"]');
            expect(confirmButton.disabled).toBeFalse();
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            fixture.detectChanges();
        });

        it('should handle empty search results', () => {
            mockSearchFunction.and.returnValue(of({ items: [] }));

            component.search();

            expect(component.dataSource.data).toEqual([]);
            expect(component.totalCount).toBe(0);
        });

        it('should handle search results with null items', () => {
            mockSearchFunction.and.returnValue(of({ items: null }));

            component.search();

            expect(component.dataSource.data).toEqual([]);
            expect(component.totalCount).toBe(0);
        });

        it('should handle search results without items property', () => {
            const directResults = [{ id: 1, name: 'Test' }];
            mockSearchFunction.and.returnValue(of(directResults));

            component.search();

            expect(component.dataSource.data).toEqual(directResults);
            expect(component.totalCount).toBe(1);
        });

        it('should handle items without ids in comparison', () => {
            const item1 = { name: 'Test1' };
            const item2 = { name: 'Test2' };

            component.selectedItem = item1;

            expect(component.isSelected(item1)).toBeTrue();
            expect(component.isSelected(item2)).toBeFalse();
        });

        it('should handle column with no display function gracefully', () => {
            const columnWithoutFunction = {
                key: 'test',
                label: 'Test',
                displayFunction: undefined as any
            };

            expect(() => {
                component.getColumnValue({ name: 'test' }, columnWithoutFunction);
            }).toThrow();
        });
    });
});
