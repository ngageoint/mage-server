import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, inject, input, output, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule, MatButtonModule]
})
export class SearchBarComponent implements OnInit {
  placeholder = input('Search...')
  debounceMs = input(300)
  searchChange = output<string>()

  private searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput')
  private destroyRef = inject(DestroyRef)

  // the keyword the parent currently has
  private keyword = ''

  searchControl = new FormControl('')
  text = toSignal(this.searchControl.valueChanges, { initialValue: this.searchControl.value })

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(this.debounceMs()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => this.publish(value ?? ''))
  }

  clear(): void {
    this.searchControl.setValue('')
    this.publish('')
    this.searchInput().nativeElement.focus()
  }

  setValue(keyword: string): void {
    this.keyword = keyword
    if ((this.searchControl.value ?? '').trim() === keyword.trim()) return
    this.searchControl.setValue(keyword)
  }

  private publish(text: string): void {
    if (text === this.keyword) return
    this.keyword = text
    this.searchChange.emit(text)
  }
}
