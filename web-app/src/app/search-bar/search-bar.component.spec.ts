import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { SearchBarComponent } from './search-bar.component'

function makeComponent(): SearchBarComponent {
  const fixture: ComponentFixture<SearchBarComponent> = TestBed.createComponent(SearchBarComponent)
  return fixture.componentInstance
}

describe('SearchBarComponent', () => {

  describe('searchChange', () => {

    it('emits after debounce when value changes', fakeAsync(() => {
      const component = makeComponent()
      const emitted: string[] = []
      component.searchChange.subscribe((v: string) => emitted.push(v))

      component.searchControl.setValue('flood')
      tick(300)

      expect(emitted).toEqual(['flood'])
    }))

    it('does not emit before debounce window expires', fakeAsync(() => {
      const component = makeComponent()
      const emitted: string[] = []
      component.searchChange.subscribe((v: string) => emitted.push(v))

      component.searchControl.setValue('flood')
      tick(100)

      expect(emitted).toEqual([])
      tick(200)
    }))

    it('emits only the last value when multiple changes occur within the debounce window', fakeAsync(() => {
      const component = makeComponent()
      const emitted: string[] = []
      component.searchChange.subscribe((v: string) => emitted.push(v))

      component.searchControl.setValue('f')
      tick(100)
      component.searchControl.setValue('fl')
      tick(100)
      component.searchControl.setValue('flood')
      tick(300)

      expect(emitted).toEqual(['flood'])
    }))

    it('does not re-emit the same value', fakeAsync(() => {
      const component = makeComponent()
      const emitted: string[] = []
      component.searchChange.subscribe((v: string) => emitted.push(v))

      component.searchControl.setValue('flood')
      tick(300)
      component.searchControl.setValue('flood')
      tick(300)

      expect(emitted).toEqual(['flood'])
    }))

    it('stops emitting after the component is destroyed', fakeAsync(() => {
      const fixture = TestBed.createComponent(SearchBarComponent)
      const component = fixture.componentInstance
      const emitted: string[] = []
      component.searchChange.subscribe((v: string) => emitted.push(v))

      fixture.destroy()
      component.searchControl.setValue('flood')
      tick(300)

      expect(emitted).toEqual([])
    }))
  })

  describe('setValue', () => {

    it('updates searchControl to the given text', fakeAsync(() => {
      const component = makeComponent()
      component.setValue('flood')
      tick(300)

      expect(component.searchControl.value).toBe('flood')
    }))

    it('clears searchControl when given an empty string', fakeAsync(() => {
      const component = makeComponent()
      component.searchControl.setValue('flood', { emitEvent: false })

      component.setValue('')
      tick(300)

      expect(component.searchControl.value).toBe('')
    }))

    it('does not emit searchChange', fakeAsync(() => {
      const component = makeComponent()
      const emitted: string[] = []
      component.searchChange.subscribe((v: string) => emitted.push(v))

      component.setValue('flood')
      tick(300)

      expect(emitted).toEqual([])
    }))

    it('does not emit searchChange when clearing', fakeAsync(() => {
      const component = makeComponent()
      const emitted: string[] = []
      component.searchChange.subscribe((v: string) => emitted.push(v))
      component.searchControl.setValue('flood', { emitEvent: false })

      component.setValue('')
      tick(300)

      expect(emitted).toEqual([])
    }))
  })

  describe('clear', () => {

    it('resets searchControl to empty string', fakeAsync(() => {
      const component = makeComponent()
      component.searchControl.setValue('flood', { emitEvent: false })

      component.clear()
      tick(300)

      expect(component.searchControl.value).toBe('')
    }))

    it('triggers searchChange emission via debounce', fakeAsync(() => {
      const component = makeComponent()
      const emitted: string[] = []
      component.searchChange.subscribe((v: string) => emitted.push(v))
      component.searchControl.setValue('flood', { emitEvent: false })

      component.clear()
      tick(300)

      expect(emitted).toEqual([''])
    }))
  })
})
