import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HelpModule } from './help.module';
import { HelpComponent, searchGuide } from './help.component';
import { USER_GUIDE } from './generated-guide';
import { downloadGuide, renderGuideHtml } from './guide-export';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { GuideCustomizationService } from './guide-customization.service';
import { SessionService } from '../http/session.service';
import { UserService } from '../user/user.service';

class FakeSession {
  token = new BehaviorSubject<string | null>(null);
  userS = new BehaviorSubject<any>(null);
  token$ = this.token.asObservable();
  user$ = this.userS.asObservable();
  get user() { return this.userS.value; }
  getToken() { return this.token.value; }
  storedToken: string | null | undefined;
  syncTokenFromStorage() {
    if (this.storedToken !== undefined && this.storedToken !== this.token.value) {
      this.userS.next(null);
      this.token.next(this.storedToken);
    }
  }
  get amAdmin() { return this.userS.value?.role?.name === 'ADMIN_ROLE'; }
  hasPermission(p: string) { return this.userS.value?.role?.permissions?.includes(p) ?? false; }
}
const admin = { role: { name: 'ADMIN_ROLE', permissions: ['UPDATE_SETTINGS'] } };
const event = { id: 7, name: 'Flood', forms: [{ id: 3, name: 'Damage', archived: false, default: false,
  fields: [{ id: 9, title: 'Depth', type: 'numberfield', required: true, archived: false, value: 'SECRET' }] }] } as any;


describe('MAGE user guide', () => {
  let service: jasmine.SpyObj<GuideCustomizationService>;
  let session: FakeSession;
  let getMyself: jasmine.Spy;
  beforeEach(() => {
    service = jasmine.createSpyObj('GuideCustomizationService', ['get', 'save', 'listEvents', 'getEvent']);
    service.get.and.callFake(() => of({ revision: 1, overrides: {} }));
    service.listEvents.and.returnValue(of({ items: [event], totalCount: 1 }));
    service.getEvent.and.returnValue(of(event));
    session = new FakeSession();
    getMyself = jasmine.createSpy('getMyself').and.callFake(() => { session.userS.next(admin); return of(admin); });
    TestBed.configureTestingModule({
      imports: [HelpModule],
      providers: [
        { provide: GuideCustomizationService, useValue: service },
        { provide: SessionService, useValue: session },
        { provide: UserService, useValue: { getMyself } },provideRouter([
        { path: 'help', component: HelpComponent },
        { path: 'home', component: HelpComponent }
      ])]
    });
  });

  it('renders the deep-linked topic and updates on topic navigation', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/help?topic=forms', HelpComponent);
    expect(component.selected.id).toBe('forms');
    expect(harness.routeNativeElement.textContent).toContain('Advanced forms');
    await harness.navigateByUrl('/help?topic=users', HelpComponent);
    expect(component.selected.id).toBe('users');
    expect(harness.routeNativeElement.textContent).toContain('offboarding');
  });

  it('shows a notice and a usable fallback for an unknown topic', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/help?topic=not-a-topic', HelpComponent);
    expect(component.selected.id).toBe('overview');
    expect(component.unknownTopic).toBe('not-a-topic');
    expect(harness.routeNativeElement.textContent).toContain('No guide topic named');
  });

  it('provides a visibly labelled return to MAGE without browser history', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/help?topic=forms', HelpComponent);
    const link: HTMLAnchorElement = harness.routeNativeElement.querySelector('a.return-home');
    expect(link.textContent).toContain('Return to MAGE');
    expect(link.getAttribute('href')).toContain('/home');
    link.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/home');
  });

  it('scrolls inside the clipped app shell and resets that surface on topic selection', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/help?topic=overview', HelpComponent);
    const host = harness.routeNativeElement as HTMLElement;
    const shell = host.parentElement;
    shell.classList.add('application');
    shell.style.cssText = 'height:320px;display:flex;flex-direction:column;overflow:hidden;width:900px';
    try {
      harness.fixture.detectChanges();
      await harness.fixture.whenStable();
      expect(getComputedStyle(host).overflowY).toBe('auto');
      expect(host.clientHeight).toBeLessThanOrEqual(320);
      expect(host.scrollHeight).toBeGreaterThan(host.clientHeight);
      host.scrollTop = 160;
      expect(host.scrollTop).toBeGreaterThan(0);
      component.select(USER_GUIDE.topics[1]);
      expect(host.scrollTop).toBe(0);
      await harness.fixture.whenStable();
    } finally {
      harness.fixture.destroy();
    }
  });

  it('searches workflow instructions and handles an empty or unmatched query', () => {
    expect(searchGuide(USER_GUIDE, 'offboarding').some(hit => hit.topic.id === 'users')).toBeTrue();
    expect(searchGuide(USER_GUIDE, 'attachment').some(hit => hit.topic.id === 'forms')).toBeTrue();
    expect(searchGuide(USER_GUIDE, '    ')).toEqual([]);
    expect(searchGuide(USER_GUIDE, 'zzzzzz-no-match')).toEqual([]);
  });

  it('exports all six actual topics or only the requested chapter', () => {
    const all = renderGuideHtml(USER_GUIDE);
    USER_GUIDE.topics.forEach(topic => expect(all).toContain(topic.title));
    const forms = renderGuideHtml(USER_GUIDE, 'forms');
    expect(forms).toContain('Advanced forms');
    expect(forms).not.toContain('id="topic-users"');
    expect(all).not.toMatch(/<(?:script|iframe|link)\b/i);
    expect(all).not.toMatch(/(?:src|href)="https?:/i);
    const pictures = all.match(/<img src="data:image\//g) || [];
    expect(pictures.length).toBeGreaterThanOrEqual(10);
  });

  it('shows pictures as readers reach the corresponding new screens', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/help?topic=forms', HelpComponent);
    const pictures = harness.routeNativeElement.querySelectorAll('figure img');
    expect(pictures.length).toBeGreaterThanOrEqual(2);
    for (const picture of Array.from(pictures)) {
      expect(picture.getAttribute('src')).toMatch(/^data:image\//);
      expect(picture.getAttribute('alt').length).toBeGreaterThan(10);
      expect(picture.closest('figure').querySelector('figcaption').textContent.trim()).not.toBe('');
    }
  });

  it('downloads HTML through a temporary link and releases its object URL', fakeAsync(() => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:guide-test');
    const revoke = spyOn(URL, 'revokeObjectURL');
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    downloadGuide(USER_GUIDE, 'forms', 20);
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[href="blob:guide-test"]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    tick(20);
    expect(revoke).toHaveBeenCalledWith('blob:guide-test');
  }));

  async function open(url = '/help?topic=overview') {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl(url, HelpComponent);
    harness.detectChanges();
    return { harness, component, el: harness.routeNativeElement as HTMLElement };
  }

  it('applies public customizations before reading and hides excluded topics', async () => {
    service.get.and.returnValue(of({ revision: 4, overrides: { users: { hidden: true }, overview: { title: 'Start here' } } }));
    const { el, component } = await open();
    expect(component.guide.topics.some(t => t.id === 'users')).toBeFalse();
    expect(el.textContent).toContain('Start here');
    expect(searchGuide(component.guide, 'offboarding').length).toBe(0);
    expect(USER_GUIDE.topics.some(t => t.id === 'users')).toBeTrue();
  });

  it('blocks download on load failure and retries', async () => {
    service.get.and.returnValue(throwError(() => ({ status: 500 })));
    const { el, harness, component } = await open();
    expect(el.querySelector('.load-error')).not.toBeNull();
    const buttons = Array.from(el.querySelectorAll('.help-actions button')) as HTMLButtonElement[];
    expect(buttons.every(b => b.disabled)).toBeTrue();
    service.get.and.returnValue(of({ revision: 1, overrides: {} }));
    (el.querySelector('.load-error .retry') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(component.ready).toBeTrue();
    expect(el.querySelector('.load-error')).toBeNull();
  });

  it('hides Customize from anonymous and non-admin readers', async () => {
    const { el, harness } = await open();
    expect(el.querySelector('.customize-guide')).toBeNull();
    session.token.next('tok');
    session.userS.next({ role: { name: 'USER_ROLE', permissions: [] } });
    harness.detectChanges();
    expect(el.querySelector('.customize-guide')).toBeNull();
    expect(service.listEvents).toHaveBeenCalled();
  });

  it('restores the session user from a stored token in a new tab', async () => {
    session.token.next('tok');
    const { el, harness } = await open();
    harness.detectChanges();
    expect(getMyself).toHaveBeenCalledWith({ suppressAuthDialog: true });
    expect(el.querySelector('.customize-guide')).not.toBeNull();
  });

  it('explains failed authentication and restores editing after signing in in another tab', async () => {
    session.token.next('expired');
    getMyself.and.returnValue(throwError(() => ({ status: 401 })));
    const { el, harness, component } = await open();
    harness.detectChanges();
    expect(el.querySelector('.customize-guide')).toBeNull();
    expect(el.querySelector('.guide-access').textContent).toContain('sign in as an administrator');
    expect(el.querySelector('.guide-access a').getAttribute('target')).toBe('_blank');
    session.storedToken = 'renewed';
    getMyself.and.callFake(() => { session.userS.next(admin); return of(admin); });
    component.refreshSession();
    harness.detectChanges();
    expect(session.getToken()).toBe('renewed');
    expect(el.querySelector('.customize-guide').textContent).toContain('Customize guide content');
    (el.querySelector('.customize-guide') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(el.querySelector('mage-guide-editor')).not.toBeNull();
  });

  it('keeps administration customization instructions out of the user guide', () => {
    expect(USER_GUIDE.topics.flatMap(t => t.sections).some(s => s.id === 'customize-guide-content')).toBeFalse();
  });

  it('does not show source-review areas or instructions for opening the guide', async () => {
    const { el } = await open();
    expect(el.querySelector('.review')).toBeNull();
    expect(el.querySelector('.flag')).toBeNull();
    expect(el.textContent).not.toContain('Source review needed');
    expect(USER_GUIDE.topics.flatMap(t => t.sections).some(s => s.title === 'Open the user guide')).toBeFalse();
  });

  it('edits toggles and text as a draft, saves only overrides, and keeps orphans', async () => {
    session.token.next('tok');
    service.get.and.returnValue(of({ revision: 2, overrides: { 'gone/old': { title: 'Kept' } } }));
    const { el, harness, component } = await open();
    (el.querySelector('.customize-guide') as HTMLButtonElement).click();
    harness.detectChanges();
    const row = el.querySelector('[data-key="users"]') as HTMLElement;
    const box = row.querySelector('input[type=checkbox]') as HTMLInputElement;
    box.checked = false; box.dispatchEvent(new Event('change'));
    const title = el.querySelector('[data-key="overview"] .title-input') as HTMLInputElement;
    title.value = 'Begin'; title.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(component.guide.topics.some(t => t.id === 'users')).toBeTrue();
    expect(el.textContent).toContain('Retained edits');
    service.save.and.callFake((s: any) => of({ ...s, revision: 3 }));
    (el.querySelector('.save') as HTMLButtonElement).click();
    harness.detectChanges();
    const sent = service.save.calls.mostRecent().args[0];
    const overview = USER_GUIDE.topics.find(t => t.id === 'overview')!;
    expect(sent.overrides['users']).toEqual({ hidden: true });
    expect(sent.overrides['overview'].title).toBe('Begin');
    expect(sent.overrides['overview'].source).toBeDefined();
    expect(sent.overrides['gone/old']).toEqual({ title: 'Kept' });
    expect(Object.keys(sent.overrides).length).toBe(3);
    expect(component.globalState!.revision).toBe(3);
    expect(component.guide.topics.some(t => t.id === 'users')).toBeFalse();
    expect(component.guide.topics[0].title).toBe('Begin');
    expect(overview.title).not.toBe('Begin');
  });

  it('cancel writes nothing; reset reverts text; conflict keeps draft and offers reload', async () => {
    session.token.next('tok');
    const { el, harness } = await open();
    (el.querySelector('.customize-guide') as HTMLButtonElement).click();
    harness.detectChanges();
    const title = el.querySelector('[data-key="overview"] .title-input') as HTMLInputElement;
    title.value = 'Changed'; title.dispatchEvent(new Event('input'));
    harness.detectChanges();
    (el.querySelector('[data-key="overview"] .reset') as HTMLButtonElement).click();
    harness.detectChanges();
    expect((el.querySelector('[data-key="overview"] .title-input') as HTMLInputElement).value).not.toBe('Changed');
    title.value = 'Changed'; title.dispatchEvent(new Event('input'));
    service.save.and.returnValue(throwError(() => ({ status: 409 })));
    harness.detectChanges();
    (el.querySelector('.save') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(el.querySelector('.reload')).not.toBeNull();
    expect(el.textContent).not.toContain('Guide customizations saved');
    expect((el.querySelector('[data-key="overview"] .title-input') as HTMLInputElement).value).toBe('Changed');
    service.save.calls.reset();
    (el.querySelector('.cancel') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(service.save).not.toHaveBeenCalled();
    expect(el.querySelector('mage-guide-editor')).toBeNull();
  });

  it('requires confirmation before resetting everything', async () => {
    session.token.next('tok');
    service.get.and.returnValue(of({ revision: 1, overrides: { users: { hidden: true } } }));
    const { el, harness } = await open();
    (el.querySelector('.customize-guide') as HTMLButtonElement).click();
    harness.detectChanges();
    (el.querySelector('.reset-all') as HTMLButtonElement).click();
    harness.detectChanges();
    expect((el.querySelector('[data-key="users"] input[type=checkbox]') as HTMLInputElement).checked).toBeFalse();
    (el.querySelector('.reset-all') as HTMLButtonElement).click();
    harness.detectChanges();
    expect((el.querySelector('[data-key="users"] input[type=checkbox]') as HTMLInputElement).checked).toBeTrue();
  });

  it('appends the event guide without field values and ignores stale event responses', async () => {
    session.token.next('tok');
    const slow = new Subject<any>();
    service.getEvent.and.callFake((id: string) => id === '1' ? slow : of(event));
    const { harness, component } = await open();
    component.selectEvent('1');
    component.selectEvent('7');
    slow.next({ ...event, name: 'Wrong' }); slow.complete();
    harness.detectChanges();
    const topic = component.guide.topics.find(t => t.id === 'event-forms')!;
    expect(topic.title).toBe('Forms for Flood');
    expect(JSON.stringify(topic)).not.toContain('SECRET');
    session.userS.next(null); session.token.next(null);
    harness.detectChanges();
    expect(component.guide.topics.some(t => t.id === 'event-forms')).toBeFalse();
    expect(component.eventId).toBeNull();
  });

  it('refreshes form definitions without AI and pauses refresh without erasing an editor draft', fakeAsync(() => {
    session.token.next('tok');
    let opened: Awaited<ReturnType<typeof open>>;
    open().then(result => opened = result);
    tick();
    const { component, harness, el } = opened!;
    component.selectEvent('7');
    service.getEvent.and.returnValue(of({ ...event, name: 'Updated training event' }));
    tick(60000);
    harness.detectChanges();
    expect(component.guide.topics.find(t => t.id === 'event-forms')!.title).toBe('Forms for Updated training event');
    const customize = el.querySelector('.customize-event') as HTMLButtonElement;
    expect(customize).not.toBeNull();
    customize.click();
    harness.detectChanges();
    const title = el.querySelector('[data-key="event-forms/form-3-field-9"] .title-input') as HTMLInputElement;
    title.value = 'Our depth instructions ';
    title.dispatchEvent(new Event('input'));
    harness.detectChanges();
    const calls = service.getEvent.calls.count();
    tick(60000);
    harness.detectChanges();
    expect(service.getEvent.calls.count()).toBe(calls);
    expect((el.querySelector('[data-key="event-forms/form-3-field-9"] .title-input') as HTMLInputElement).value).toBe('Our depth instructions ');
    harness.fixture.destroy();
  }));
});
