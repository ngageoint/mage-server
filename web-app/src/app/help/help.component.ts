import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, catchError, filter, forkJoin, map, merge, of, startWith, switchMap, takeUntil, timer } from 'rxjs';
import { GuideDocument, GuideTopic, GuideSection, GuideImage, guideImagePosition } from './guide.model';
import { USER_GUIDE } from './generated-guide';
import { downloadGuide } from './guide-export';
import { GuideCustomizationService } from './guide-customization.service';
import { GuideCustomizationState, applyGuideCustomizations, eventGuide } from './guide-customization';
import { SessionService } from '../http/session.service';
import { UserService } from '../user/user.service';
import { MageEvent } from '../entities/event/entities.event';

export interface GuideMatch {
  topic: GuideTopic;
  section: string;
  snippet: string;
}

/** Search titles, summaries, body and steps. Pure for testing. */
export function searchGuide(doc: GuideDocument, query: string, limit = 30): GuideMatch[] {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return [];
  const out: GuideMatch[] = [];
  const snip = (text: string) => {
    const i = text.toLowerCase().indexOf(q);
    const start = Math.max(0, i - 40);
    return (start > 0 ? '...' : '') + text.slice(start, i + q.length + 80) + (i + q.length + 80 < text.length ? '...' : '');
  };
  for (const topic of doc.topics) {
    for (const text of [topic.title, topic.summary]) {
      if (text?.toLowerCase().includes(q)) { out.push({ topic, section: topic.title, snippet: snip(text) }); break; }
    }
    for (const s of topic.sections) {
      const hit = [s.title, ...s.body, ...s.steps].find(t => t?.toLowerCase().includes(q));
      if (hit) out.push({ topic, section: s.title, snippet: snip(hit) });
    }
  }
  return out.slice(0, limit);
}

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'mage-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
  standalone: false
})
export class HelpComponent implements OnInit, OnDestroy {
  /** Generated source; never mutated. */
  readonly source: GuideDocument = USER_GUIDE;
  /** What readers see, search, download and print. */
  guide: GuideDocument = { ...USER_GUIDE, topics: [] };
  globalState: GuideCustomizationState | null = null;
  globalLoad: LoadState = 'loading';

  user: any = null;
  canCustomize = false;
  sessionChecking = false;
  sessionError = false;
  private sessionRefresh$ = new Subject<void>();

  events: MageEvent[] = [];
  eventsTotal = 0;
  eventsPage = 0;
  eventsLoading = false;
  eventsError = false;
  eventId: string | null = null;
  event: MageEvent | null = null;
  eventState: GuideCustomizationState | null = null;
  eventLoad: LoadState | null = null;
  eventSource: GuideTopic[] = [];

  editing: 'global' | 'event' | null = null;

  selected: GuideTopic | null = null;
  unknownTopic: string | null = null;
  private requestedTopic: string | null = null;
  query = '';
  matches: GuideMatch[] = [];
  status: { kind: 'ok' | 'error'; text: string } | null = null;

  private destroy$ = new Subject<void>();
  private global$ = new Subject<void>();
  private eventSelect$ = new Subject<string | null>();
  private eventsSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private changes: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>,
    private customizations: GuideCustomizationService,
    private session: SessionService,
    private users: UserService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.requestedTopic = params.get('topic');
      this.resolveSelection();
    });

    merge(this.global$, timer(60000, 60000)).pipe(
      filter(() => !this.editing),
      switchMap(() => this.customizations.get('global').pipe(
        map(state => ({ state })), catchError(() => of({ state: null as GuideCustomizationState | null })))),
      takeUntil(this.destroy$)
    ).subscribe(({ state }) => {
      this.globalState = state;
      this.globalLoad = state ? 'ready' : 'error';
      this.rebuild();
    });
    this.loadGlobal();

    this.eventSelect$.pipe(
      switchMap(id => {
        if (!id) return of(null);
        return timer(60000, 60000).pipe(
          startWith(0),
          filter(() => !this.editing),
          switchMap(() => forkJoin({ event: this.customizations.getEvent(id), state: this.customizations.get(id) }).pipe(
            map(r => ({ id, ...r })), catchError(() => of({ id, event: null, state: null })))));
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (!result || result.id !== this.eventId) return;
      this.event = result.event;
      this.eventSource = result.event ? [eventGuide(result.event)] : [];
      this.eventState = result.state;
      this.eventLoad = result.event && result.state ? 'ready' : 'error';
      this.rebuild();
    });

    // A guide may stay open in its own tab while the user signs in elsewhere.
    this.session.syncTokenFromStorage();
    merge(this.session.token$, this.sessionRefresh$).pipe(
      filter(() => !this.editing),
      switchMap(() => {
        this.sessionError = false;
        this.sessionChecking = !!this.session.getToken();
        if (!this.session.getToken()) return of(null);
        return this.users.getMyself({ suppressAuthDialog: true }).pipe(
          catchError(() => {
            this.sessionError = true;
            return of(null);
          }));
      }),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.sessionChecking = false;
      if (this.sessionError) this.canCustomize = false;
      this.changes.markForCheck();
    });

    this.session.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      const wasSignedIn = !!this.user;
      const changedAccount = !!this.user && this.user.id !== user?.id;
      if (changedAccount) this.clearEventState();
      this.user = user;
      this.canCustomize = !this.sessionError && !!user && this.session.amAdmin && this.session.hasPermission('UPDATE_SETTINGS');
      if (!this.canCustomize) this.editing = null;
      if (!user || !this.session.getToken()) {
        this.clearEventState();
        this.rebuild();
      } else if (!wasSignedIn || changedAccount) {
        this.loadEvents(0);
      }
      this.changes.markForCheck();
    });
  }

  @HostListener('window:focus')
  refreshSession(): void {
    if (this.editing) return;
    // A token change already triggers the stream, so avoid a duplicate request.
    const token = this.session.getToken();
    this.session.syncTokenFromStorage();
    if (token === this.session.getToken()) this.sessionRefresh$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.eventsSub?.unsubscribe();
  }

  loadGlobal(): void {
    this.globalLoad = 'loading';
    this.global$.next();
  }

  private clearEventState(): void {
    this.eventsSub?.unsubscribe();
    this.events = [];
    this.eventsTotal = 0;
    this.eventsPage = 0;
    this.eventsLoading = false;
    this.eventsError = false;
    this.eventId = null;
    this.event = null;
    this.eventSource = [];
    this.eventState = null;
    this.eventLoad = null;
    if (this.editing === 'event') this.editing = null;
    this.eventSelect$.next(null);
  }

  loadEvents(page: number): void {
    if (!this.user || !this.session.getToken()) return;
    this.eventsSub?.unsubscribe();
    this.eventsLoading = true;
    this.eventsError = false;
    this.eventsSub = this.customizations.listEvents(page).subscribe({
      next: res => {
        this.events = page === 0 ? res.items : [...this.events, ...res.items];
        this.eventsTotal = res.totalCount;
        this.eventsPage = page;
        this.eventsLoading = false;
        this.changes.markForCheck();
      },
      error: () => { this.eventsLoading = false; this.eventsError = true; this.changes.markForCheck(); }
    });
  }

  get moreEvents(): boolean { return this.events.length < this.eventsTotal; }

  selectEvent(id: string): void {
    if (!this.user || !this.session.getToken()) return;
    const next = id || null;
    if (this.editing === 'event') this.editing = null;
    this.eventId = next;
    this.event = null;
    this.eventSource = [];
    this.eventState = null;
    this.eventLoad = next ? 'loading' : null;
    this.rebuild();
    this.eventSelect$.next(next);
  }

  retryEvent(): void { if (this.eventId) this.selectEvent(this.eventId); }

  private rebuild(): void {
    if (this.globalLoad !== 'ready' || !this.globalState) {
      this.guide = { ...this.source, topics: [] };
    } else {
      const base = applyGuideCustomizations(this.source, this.globalState);
      const topics = [...base.topics];
      if (this.event && this.eventState && this.eventLoad === 'ready') {
        const doc = applyGuideCustomizations({ ...this.source, topics: this.eventSource }, this.eventState);
        topics.push(...doc.topics);
      }
      this.guide = { ...base, edition: this.event ? `${base.edition}-event-${this.event.id}-${this.eventState?.revision}` : base.edition, topics };
    }
    if (this.query) this.matches = searchGuide(this.guide, this.query);
    this.resolveSelection();
  }

  private resolveSelection(): void {
    const id = this.requestedTopic;
    const found = this.guide.topics.find(t => t.id === id);
    this.unknownTopic = this.ready && id && !found && !(id === 'event-forms' && this.eventLoad === 'loading') ? id : null;
    this.selected = found ?? this.guide.topics[0] ?? null;
    this.changes.markForCheck();
  }

  get ready(): boolean { return this.globalLoad === 'ready' && (!this.eventId || this.eventLoad === 'ready'); }

  get reviewCount(): number {
    return this.guide.topics.filter(t => t.needsReview).length;
  }

  startEditing(scope: 'global' | 'event'): void {
    if (!this.canCustomize || this.sessionChecking) return;
    if (scope === 'event' && (!this.event || !this.eventState)) return;
    if (scope === 'global' && !this.globalState) return;
    this.editing = scope;
    this.status = null;
  }

  onSaved(scope: 'global' | 'event', state: GuideCustomizationState): void {
    if (scope === 'global') this.globalState = state;
    else if (this.eventState) this.eventState = state;
    this.editing = null;
    this.status = { kind: 'ok', text: 'Guide customizations saved.' };
    this.rebuild();
  }

  select(topic: GuideTopic): void {
    this.query = '';
    this.matches = [];
    this.router.navigate([], { relativeTo: this.route, queryParams: { topic: topic.id }, replaceUrl: false });
    this.host.nativeElement.scrollTo?.({ top: 0, behavior: 'auto' });
  }

  onSearch(value: string): void {
    this.query = value;
    this.matches = searchGuide(this.guide, value);
  }

  download(all: boolean): void {
    if (!this.ready || this.editing) return;
    try {
      downloadGuide(this.guide, all ? undefined : this.selected?.id);
      this.status = { kind: 'ok', text: all ? 'Full guide downloaded.' : 'Chapter downloaded.' };
    } catch (e) {
      this.status = {
        kind: 'error',
        text: 'Download failed' + (e instanceof Error && e.message ? `: ${e.message}` : '.') + ' Try Print / Save as PDF instead.'
      };
    }
  }

  print(): void { if (this.ready && !this.editing) window.print(); }

  trackById(_: number, t: GuideTopic): string { return t.id; }
  imagesAt(section: GuideSection, position: string): GuideImage[] {
    return (section.images || []).filter(image => guideImagePosition(image, section) === position);
  }
  eventKey(e: MageEvent): string { return String(e.id); }
}
