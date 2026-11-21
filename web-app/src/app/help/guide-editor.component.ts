import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { GuideSection, GuideTopic, guideImagePosition } from './guide.model';
import { GuideCustomizationService } from './guide-customization.service';
import { GuideCustomizationState, GuideOverride, GuideImageOverride, guideNodeKey, guideSource } from './guide-customization';

export interface GuideEditorRow {
  key: string;
  kind: 'topic' | 'section';
  depth: number;
  original: GuideTopic | GuideSection;
  title: string;
  body: string[];
  steps: string[];
}

const lines = (text: string): string[] => text ? text.split('\n') : [];
const same = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

/** Builds editable rows from generated source. Topic "body" is its summary split into paragraphs. */
export function editorRows(topics: GuideTopic[]): GuideEditorRow[] {
  const rows: GuideEditorRow[] = [];
  for (const topic of topics) {
    rows.push({ key: guideNodeKey(topic), kind: 'topic', depth: 0, original: topic, title: topic.title,
      body: (topic.summary || '').split(/\n\n+/).filter(p => p.trim()), steps: [] });
    for (const section of topic.sections) {
      rows.push({ key: guideNodeKey(topic, section), kind: 'section', depth: 1, original: section,
        title: section.title, body: section.body, steps: section.steps });
    }
  }
  return rows;
}

@Component({
  selector: 'mage-guide-editor',
  templateUrl: './guide-editor.component.html',
  styleUrls: ['./guide-editor.component.scss'],
  standalone: false
})
export class GuideEditorComponent implements OnChanges, OnDestroy {
  /** Generated, uncustomized source for this scope. */
  @Input() topics: GuideTopic[] = [];
  @Input() state!: GuideCustomizationState;
  /** 'global' or an event id. */
  @Input() scope = 'global';
  @Input() scopeLabel = 'All readers';
  @Output() saved = new EventEmitter<GuideCustomizationState>();
  @Output() cancelled = new EventEmitter<void>();

  rows: GuideEditorRow[] = [];
  draft: Record<string, GuideOverride> = {};
  revision = 0;
  saving = false;
  conflict = false;
  error: string | null = null;
  confirmResetAll = false;
  filter = '';
  private sub?: Subscription;
  uploading = false;
  private uploadSub?: Subscription;
  private reader?: FileReader;
  private destroyed = false;

  constructor(private service: GuideCustomizationService, private changes: ChangeDetectorRef) {}

  ngOnChanges(): void {
    this.rows = editorRows(this.topics);
    this.loadDraft(this.state);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.sub?.unsubscribe();
    this.uploadSub?.unsubscribe();
    this.reader?.abort();
  }

  private loadDraft(state: GuideCustomizationState | undefined): void {
    // Deep copy so the reader never sees unsaved changes; unknown keys and fields are retained.
    this.draft = JSON.parse(JSON.stringify(state?.overrides || {}));
    this.revision = state?.revision ?? 0;
    this.conflict = false;
    this.error = null;
    this.confirmResetAll = false;
  }

  get isGlobal(): boolean { return this.scope === 'global'; }

  get visibleRows(): GuideEditorRow[] {
    const q = this.filter.trim().toLowerCase();
    return q ? this.rows.filter(r => r.title.toLowerCase().includes(q) || this.titleOf(r).toLowerCase().includes(q)) : this.rows;
  }

  get orphanKeys(): string[] {
    const known = new Set(this.rows.map(r => r.key));
    return Object.keys(this.draft).filter(k => !known.has(k)).sort();
  }

  get changeCount(): number { return Object.keys(this.draft).length; }

  get dirty(): boolean { return JSON.stringify(this.draft) !== JSON.stringify(this.state?.overrides || {}); }

  included(row: GuideEditorRow): boolean { return !this.draft[row.key]?.hidden; }
  parentHidden(row: GuideEditorRow): boolean {
    if (row.kind === 'topic') return false;
    const topicKey = row.key.split('/')[0];
    return !!this.draft[topicKey]?.hidden;
  }
  edited(row: GuideEditorRow): boolean {
    const o = this.draft[row.key];
    return !!o && (o.title !== undefined || o.body !== undefined || o.steps !== undefined);
  }
  stale(row: GuideEditorRow): boolean {
    const o = this.draft[row.key];
    return !!o?.source && this.edited(row) && o.source !== guideSource(row.original);
  }

  titleOf(row: GuideEditorRow): string { return this.draft[row.key]?.title ?? row.title; }
  bodyOf(row: GuideEditorRow): string { return (this.draft[row.key]?.body ?? row.body).join('\n'); }
  stepsOf(row: GuideEditorRow): string { return (this.draft[row.key]?.steps ?? row.steps).join('\n'); }

  imagesOf(row: GuideEditorRow): GuideImageOverride[] {
    return this.draft[row.key]?.images ?? ((row.original as GuideSection).images || []).map((image, generatedIndex) => ({
      generatedIndex, afterStep: image.afterStep, afterParagraph: image.afterParagraph, alt: image.alt, caption: image.caption
    }));
  }
  imageSrc(row: GuideEditorRow, image: GuideImageOverride): string {
    return image.dataUrl || (row.original as GuideSection).images?.[image.generatedIndex!]?.dataUrl || '';
  }
  positions(row: GuideEditorRow): { value: string; label: string }[] {
    const body = this.draft[row.key]?.body ?? row.body;
    const steps = this.draft[row.key]?.steps ?? row.steps;
    return [{ value: 'paragraph:0', label: 'Before the text' },
      ...body.map((_, n) => ({ value: `paragraph:${n + 1}`, label: `After paragraph ${n + 1}` })),
      ...steps.map((_, n) => ({ value: `step:${n + 1}`, label: `After step ${n + 1}` }))];
  }
  positionOf(row: GuideEditorRow, image: GuideImageOverride): string {
    return guideImagePosition(image as any, { body: this.draft[row.key]?.body ?? row.body, steps: this.draft[row.key]?.steps ?? row.steps } as GuideSection);
  }
  updateImage(row: GuideEditorRow, index: number, change: Partial<GuideImageOverride>): void {
    this.patch(row.key, { images: this.imagesOf(row).map((image, n) => n === index ? { ...image, ...change } : image) });
  }
  placeImage(row: GuideEditorRow, index: number, value: string): void {
    const [kind, n] = value.split(':');
    this.updateImage(row, index, kind === 'paragraph' ? { afterParagraph: Number(n), afterStep: 0 }
      : { afterParagraph: undefined, afterStep: Number(n) });
  }
  removeImage(row: GuideEditorRow, index: number): void {
    this.patch(row.key, { images: this.imagesOf(row).filter((_, n) => n !== index) });
  }
  moveImage(row: GuideEditorRow, index: number, delta: number): void {
    const images = [...this.imagesOf(row)];
    if (!images[index + delta]) return;
    [images[index], images[index + delta]] = [images[index + delta], images[index]];
    this.patch(row.key, { images });
  }
  restoreImages(row: GuideEditorRow): void { this.patch(row.key, { images: undefined }); }
  uploadImage(row: GuideEditorRow, input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploading || this.saving) return;
    this.error = null;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      this.error = 'Choose a PNG, JPEG or WebP screenshot no larger than 1 MiB.'; return;
    }
    if (this.imagesOf(row).length >= 20) { this.error = 'Each section can contain up to 20 screenshots.'; return; }
    this.uploading = true;
    this.reader = new FileReader();
    this.reader.onerror = () => { this.uploading = false; this.error = 'Screenshot could not be read.'; this.changes.markForCheck(); };
    this.reader.onload = () => {
      if (this.destroyed) return;
      this.uploadSub = this.service.uploadImage(String(this.reader!.result), this.scope).subscribe({
        next: image => {
          this.patch(row.key, { images: [...this.imagesOf(row), { ...image, afterStep: 0, afterParagraph: 0,
            alt: 'Workflow screenshot', caption: '' }] });
          this.uploading = false;
          this.changes.markForCheck();
        },
        error: () => { this.uploading = false; this.error = 'Screenshot upload failed. Use a valid image no larger than 1 MiB and try again.'; this.changes.markForCheck(); }
      });
    };
    this.reader.readAsDataURL(file);
  }

  private patch(key: string, change: Partial<GuideOverride>, row?: GuideEditorRow): void {
    const next: GuideOverride = { ...(this.draft[key] || {}), ...change };
    (Object.keys(next) as (keyof GuideOverride)[]).forEach(k => { if (next[k] === undefined) delete next[k]; });
    if (!next.hidden) delete next.hidden;
    const hasText = next.title !== undefined || next.body !== undefined || next.steps !== undefined;
    if (row) {
      if (hasText) { if (!this.draft[key]?.source || !this.edited(row)) next.source = guideSource(row.original); }
      else delete next.source;
    }
    if (Object.keys(next).length) this.draft = { ...this.draft, [key]: next };
    else { const { [key]: _, ...rest } = this.draft; this.draft = rest; }
  }

  setIncluded(row: GuideEditorRow, include: boolean): void {
    this.patch(row.key, { hidden: include ? undefined : true });
  }

  setTitle(row: GuideEditorRow, value: string): void {
    const v = value;
    this.patch(row.key, { title: !v || v === row.title ? undefined : v }, row);
  }
  setBody(row: GuideEditorRow, value: string): void {
    const v = lines(value);
    this.patch(row.key, { body: same(v, row.body) ? undefined : v }, row);
  }
  setSteps(row: GuideEditorRow, value: string): void {
    const v = lines(value);
    this.patch(row.key, { steps: same(v, row.steps) ? undefined : v }, row);
  }

  /** Back to generated text; inclusion choice is kept. */
  resetText(row: GuideEditorRow): void {
    this.patch(row.key, { title: undefined, body: undefined, steps: undefined, source: undefined }, row);
  }

  removeOrphan(key: string): void {
    const { [key]: _, ...rest } = this.draft;
    this.draft = rest;
  }

  describeOrphan(key: string): string {
    const o = this.draft[key];
    const parts = [o.hidden ? 'excluded' : '', o.title !== undefined ? `title "${o.title}"` : '',
      o.body ? `${o.body.length} paragraph(s)` : '', o.steps ? `${o.steps.length} step(s)` : ''].filter(Boolean);
    return parts.join(', ') || 'stored edit';
  }

  resetAll(): void {
    if (!this.confirmResetAll) { this.confirmResetAll = true; return; }
    this.draft = {};
    this.confirmResetAll = false;
  }

  cancel(): void {
    this.sub?.unsubscribe();
    this.loadDraft(this.state);
    this.cancelled.emit();
  }

  save(): void {
    if (this.saving || this.uploading) return;
    this.saving = true;
    this.error = null;
    this.conflict = false;
    this.sub = this.service.save({ revision: this.revision, overrides: this.draft }, this.scope).subscribe({
      next: result => { this.saving = false; this.changes.markForCheck(); this.saved.emit(result); },
      error: err => {
        this.saving = false;
        if (err?.status === 409) {
          this.conflict = true;
          this.error = 'Someone else saved this guide first. Your draft is still here and was not saved.';
        } else {
          this.error = 'Save failed' + (err?.status ? ` (${err.status})` : '') + '. Your draft is still here and was not saved.';
        }
        this.changes.markForCheck();
      }
    });
  }

  /** Explicitly discard the draft and load the latest saved version. */
  reloadLatest(): void {
    this.sub?.unsubscribe();
    this.saving = true;
    this.sub = this.service.get(this.scope).subscribe({
      next: latest => { this.saving = false; this.state = latest; this.loadDraft(latest); this.changes.markForCheck(); },
      error: () => { this.saving = false; this.error = 'Could not load the latest saved version. Your draft is unchanged.'; this.changes.markForCheck(); }
    });
  }

  trackByKey(_: number, r: GuideEditorRow): string { return r.key; }
  trackByImage(index: number): number { return index; }
  trackByPosition(_: number, position: { value: string }): string { return position.value; }
}
