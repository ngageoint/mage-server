import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

/**
 * Generic drag-and-drop list component that can be reused for any type of items.
 * Supports both drag-and-drop and manual up/down reordering.
 */
@Component({
    selector: 'mage-draggable-list',
    templateUrl: './draggable-list.component.html',
    styleUrls: ['./draggable-list.component.scss']
})
export class DraggableListComponent<T = any> {
    @Input() items: T[] = [];
    @Input() enableDragDrop: boolean = true;
    @Input() emptyMessage: string = 'No items to display';
    @Input() emptyIcon: string = 'fa-inbox';
    @Input() trackByFunction?: (index: number, item: T) => any;

    @Output() itemsChange = new EventEmitter<T[]>();
    @Output() itemClick = new EventEmitter<T>();
    @Output() itemMoved = new EventEmitter<{ item: T, previousIndex: number, currentIndex: number }>();

    // Content projection for custom item templates
    @ContentChild('itemTemplate', { static: false }) itemTemplate?: TemplateRef<any>;
    @ContentChild('itemActionsTemplate', { static: false }) itemActionsTemplate?: TemplateRef<any>;

    /**
     * Handles drag and drop reordering
     */
    onDrop(event: CdkDragDrop<T[]>): void {
        if (event.previousIndex === event.currentIndex) {
            return;
        }

        const itemsCopy = [...this.items];
        moveItemInArray(itemsCopy, event.previousIndex, event.currentIndex);

        this.itemMoved.emit({
            item: itemsCopy[event.currentIndex],
            previousIndex: event.previousIndex,
            currentIndex: event.currentIndex
        });

        this.items = itemsCopy;
        this.itemsChange.emit(this.items);
    }

    /**
     * Moves an item up in the list
     */
    moveUp(index: number): void {
        if (index <= 0) {
            return;
        }

        const itemsCopy = [...this.items];
        [itemsCopy[index], itemsCopy[index - 1]] = [itemsCopy[index - 1], itemsCopy[index]];

        this.itemMoved.emit({
            item: itemsCopy[index - 1],
            previousIndex: index,
            currentIndex: index - 1
        });

        this.items = itemsCopy;
        this.itemsChange.emit(this.items);
    }

    /**
     * Moves an item down in the list
     */
    moveDown(index: number): void {
        if (index >= this.items.length - 1) {
            return;
        }

        const itemsCopy = [...this.items];
        [itemsCopy[index], itemsCopy[index + 1]] = [itemsCopy[index + 1], itemsCopy[index]];

        this.itemMoved.emit({
            item: itemsCopy[index + 1],
            previousIndex: index,
            currentIndex: index + 1
        });

        this.items = itemsCopy;
        this.itemsChange.emit(this.items);
    }

    /**
     * Checks if item can be moved up
     */
    canMoveUp(index: number): boolean {
        return index > 0;
    }

    /**
     * Checks if item can be moved down
     */
    canMoveDown(index: number): boolean {
        return index < this.items.length - 1;
    }

    /**
     * Handles item click
     */
    onItemClick(item: T): void {
        this.itemClick.emit(item);
    }

    /**
     * Default track by function
     */
    trackByIndex(index: number, item: T): any {
        return this.trackByFunction ? this.trackByFunction(index, item) : index;
    }
}
