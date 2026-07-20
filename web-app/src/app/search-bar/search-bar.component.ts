import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'search-bar',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, MatButtonModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent {
  @Input() placeholder = 'Search...'
  @Input() debounceMs = 300
  @Output() searchChange = new EventEmitter<string>()

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>

  searchControl = new FormControl('')
  hasValue = signal(false)

  constructor() {
    this.searchControl.valueChanges.pipe(
      takeUntilDestroyed()
    ).subscribe(value => {
      this.hasValue.set(Boolean(value))
    })

    this.searchControl.valueChanges.pipe(
      debounceTime(this.debounceMs),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(value => {
      this.searchChange.emit(value ?? '')
    })
  }

  clear(): void {
    this.searchControl.setValue('')
    this.searchInput?.nativeElement.focus()
  }

  setValue(text: string): void {
    this.searchControl.setValue(text, { emitEvent: false })
    this.hasValue.set(Boolean(text))
  }
}
