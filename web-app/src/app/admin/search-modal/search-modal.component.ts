import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef as MatDialogRef, MAT_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTableDataSource as MatTableDataSource } from '@angular/material/table';
import { PageEvent as PageEvent } from '@angular/material/paginator';

export interface SearchModalColumn {
    key: string;
    label: string;
    displayFunction: (item: any) => string;
    width?: string;
}

export interface SearchModalData {
    title: string;
    searchPlaceholder: string;
    teamId?: string;
    searchFunction: (searchTerm: string, page: number, pageSize: number) => Observable<any>;
    columns: SearchModalColumn[];
    selectedItem?: any;
    icon?: string | ((item: any) => string) | null;
}

export interface SearchModalResult {
    selectedItem: any;
}

/**
 * A reusable modal component for searching and selecting items from a paginated list.
 * Provides a searchable table interface with customizable columns and search functionality.
 * Used for selecting users, events, or other entities to add to teams or perform other operations.
 */
@Component({
    selector: 'app-search-modal',
    templateUrl: './search-modal.component.html',
    styleUrls: ['./search-modal.component.scss'],
    standalone: false
})
export class SearchModalComponent implements OnInit, OnDestroy {
    dataSource = new MatTableDataSource<any>();
    displayedColumns: string[] = [];
    columns: SearchModalColumn[] = [];

    loading = false;
    pageIndex = 0;
    pageSize = 5;
    totalCount = 0;
    pageSizeOptions = [5];

    selectedItem: any = null;
    currentSearchTerm = '';

    private destroy$ = new Subject<void>();

    /**
     * Component constructor. Initializes the modal with provided data and sets up columns.
     * @param dialogRef - Reference to the Material dialog for closing and returning results
     * @param data - Configuration data including search function, columns, and modal settings
     */
    constructor(
        public dialogRef: MatDialogRef<SearchModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: SearchModalData
    ) {
        if (data.selectedItem) {
            this.selectedItem = data.selectedItem;
        }

        this.columns = data.columns;
        this.displayedColumns = data.columns.map(col => col.key);
    }

    /**
     * Performs the initial search to populate the modal with data.
     */
    ngOnInit(): void {
        this.search();
    }

    /**
     * Component destruction lifecycle hook.
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Executes a search using the provided search function.
     */
    search(): void {
        const searchTerm = this.currentSearchTerm || '';
        this.loading = true;

        this.data.searchFunction(searchTerm, this.pageIndex, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (results) => {
                    this.loading = false;
                    this.dataSource.data = results.items || results || [];
                    this.totalCount = results.totalCount || this.dataSource.data.length;
                },
                error: (error) => {
                    this.loading = false;
                    console.error('Search error:', error);
                    this.dataSource.data = [];
                    this.totalCount = 0;
                }
            });
    }

    /**
     * Updates the current page index and triggers a new search.
     * @param event - The pagination event containing the new page information
     */
    onPageChange(event: PageEvent): void {
        this.pageIndex = event.pageIndex;
        this.search();
    }

    /**
     * Checks if the given item is currently selected.
     * @param item - The item to check for selection status
     * @returns True if the item is selected, false otherwise
     */
    isSelected(item: any): boolean {
        return this.selectedItem && this.isSameItem(this.selectedItem, item);
    }

    /**
     * Toggles the selection state of an item.
     * @param item - The item to toggle selection for
     */
    toggleSelection(item: any): void {
        if (this.isSelected(item)) {
            this.selectedItem = null;
        } else {
            this.selectedItem = item;
        }
    }

    /**
     * Handles row click events to toggle item selection.
     * @param item - The item in the clicked row
     * @param event - The mouse event to prevent default behavior
     */
    onRowClick(item: any, event: MouseEvent): void {
        event.preventDefault();
        this.toggleSelection(item);
    }

    /**
     * Compares two items to determine if they are the same.
     * @param item1 - The first item to compare
     * @param item2 - The second item to compare
     * @returns if the items are the same
     */
    private isSameItem(item1: any, item2: any): boolean {
        // Compare by id if available, otherwise by reference
        if (item1.id && item2.id) {
            return item1.id === item2.id;
        }
        return item1 === item2;
    }

    /**
     * Resolves the list item icon for a row, supporting either a static icon name
     * or a function that derives the icon from the item.
     * @param item - The data item to derive the icon from
     * @returns The icon name to display, or null if no icon is configured
     */
    getItemIcon(item: any): string | null {
        if (!this.data.icon) return null;
        return typeof this.data.icon === 'function' ? this.data.icon(item) : this.data.icon;
    }

    /**
     * Gets the display value for a specific column and item.
     * @param item - The data item to get the value from
     * @param column - The column configuration containing the display function
     * @returns The formatted display string for the column
     */
    getColumnValue(item: any, column: SearchModalColumn): string {
        return column.displayFunction(item);
    }

    /**
     * Gets the secondary line text for a list item by joining all columns after the first.
     * @param item - The data item to get the value from
     * @returns The joined display string for the secondary columns
     */
    getSecondaryText(item: any): string {
        return this.columns.slice(1)
            .map(column => this.getColumnValue(item, column))
            .filter(text => !!text)
            .join(' • ');
    }

    /**
     * Finds a column configuration by its key.
     * @param key - The key of the column to find
     * @returns The column configuration if found, undefined otherwise
     */
    getColumnByKey(key: string): SearchModalColumn | undefined {
        return this.columns.find(col => col.key === key);
    }

    /**
     * Updates the current search term, resets pagination, and triggers a new search.
     * @param searchTerm - The new search term to filter results by
     */
    onSearchTermChanged(searchTerm: string): void {
        this.currentSearchTerm = searchTerm;
        this.pageIndex = 0;
        this.search();
    }

    /**
     * Resets the search term to empty, resets pagination, and triggers a new search.
     */
    onSearchCleared(): void {
        this.currentSearchTerm = '';
        this.pageIndex = 0;
        this.search();
    }

    /**
     * Confirms the selection and closes the modal.
     */
    onConfirm(): void {
        this.dialogRef.close({
            selectedItem: this.selectedItem
        } as SearchModalResult);
    }

    /**
     * Gets the count of currently selected items.
     * @returns The number of selected items (0 or 1 for single selection)
     */
    getSelectedCount(): number {
        return this.selectedItem ? 1 : 0;
    }
}
