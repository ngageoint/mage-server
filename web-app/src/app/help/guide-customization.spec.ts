import { applyGuideCustomizations, emptyGuideCustomizations, eventGuide, guideNodeKey, guideSource } from './guide-customization';
import { GuideDocument } from './guide.model';
import { renderGuideHtml } from './guide-export';

const base: GuideDocument = { version: '1', edition: 'edition', topics: [{
  id: 'forms', title: 'Forms', summary: 'Use forms', audience: 'Everyone', route: '/home', icon: 'map',
  needsReview: false, changedSources: [], controls: [],
  sections: [{ id: 'stable-field', title: 'Text field', body: ['Generated instruction'], steps: ['Open'], images: [] }]
}] };

describe('deterministic guide overlays', () => {
  it('preserves source and edits when generated labels change', () => {
    const source = JSON.stringify(base);
    const state = { revision: 2, overrides: {
      'forms/stable-field': { title: 'Our answer field', source: guideSource(base.topics[0].sections[0]) }
    } };
    const updated = JSON.parse(JSON.stringify(base)) as GuideDocument;
    updated.topics[0].sections[0].title = 'New generated label';
    const guide = applyGuideCustomizations(updated, state);
    expect(guide.topics[0].sections[0].title).toBe('Our answer field');
    expect(guide.topics[0].needsReview).toBeTrue();
    expect(JSON.stringify(base)).toBe(source);
    expect(guideNodeKey(updated.topics[0], updated.topics[0].sections[0])).toBe('forms/stable-field');
  });
  it('excludes sections from reading, exports and search data but includes new source sections', () => {
    const doc = JSON.parse(JSON.stringify(base)) as GuideDocument;
    doc.topics[0].sections.push({ id: 'new', title: 'New section', body: [], steps: [] });
    const guide = applyGuideCustomizations(doc, { revision: 1, overrides: { 'forms/stable-field': { hidden: true } } });
    expect(guide.topics[0].sections.map(s => s.title)).toEqual(['New section']);
    expect(renderGuideHtml(guide)).not.toContain('Generated instruction');
  });
  it('preserves manual text, field visibility and screenshot placement over refreshed defaults and exports', () => {
    const image = { assetId: 'a'.repeat(32), dataUrl: 'data:image/png;base64,AQID', alt: 'Training workflow',
      caption: 'Review this screen', afterStep: 0, afterParagraph: 1 };
    const doc = JSON.parse(JSON.stringify(base)) as GuideDocument;
    doc.topics[0].sections.push({ id: 'hidden-field', title: 'Private field', body: [], steps: [] });
    doc.topics[0].sections[0].title = 'Updated default';
    doc.topics[0].sections[0].body = ['Updated generated instructions'];
    const state = { revision: 5, overrides: {
      'forms/stable-field': { body: ['Administrator instructions'], images: [image] },
      'forms/hidden-field': { hidden: true }
    } };
    const before = JSON.stringify(state);
    const result = applyGuideCustomizations(doc, state);
    expect(result.topics[0].sections.length).toBe(1);
    expect(result.topics[0].sections[0].title).toBe('Updated default');
    expect(result.topics[0].sections[0].body).toEqual(['Administrator instructions']);
    expect(result.topics[0].sections[0].images?.[0]).toEqual(image);
    const offline = renderGuideHtml(result);
    expect(offline).toContain('Administrator instructions');
    expect(offline).toContain('Training workflow');
    expect(offline).toContain('data:image/png;base64,AQID');
    expect(offline).not.toContain('Private field');
    expect(JSON.stringify(state)).toBe(before);
  });
  it('escapes manual text in offline output and resets to automatic without mutating source', () => {
    const custom = applyGuideCustomizations(base, { revision: 1, overrides: {
      'forms/stable-field': { body: ['<script>bad()</script>'] }
    } });
    expect(renderGuideHtml(custom)).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    expect(renderGuideHtml(custom)).not.toContain('<script>');
    expect(applyGuideCustomizations(base, emptyGuideCustomizations()).topics[0].sections[0].body).toEqual(['Generated instruction']);
  });
  it('generates event fields from configuration, not saved values, users or observations', () => {
    const topic = eventGuide({ id: 1, name: 'Training', forms: [
      { id: 8, name: 'Sample', fields: [
        { id: 1, title: 'Photo', type: 'attachment', allowedAttachmentTypes: ['image', 'video'], value: 'SECRET' },
        { id: 2, title: 'Status', type: 'dropdown', choices: [{ title: 'Open', value: 'SECRET' }] },
        { id: 3, title: 'Password', type: 'password', value: 'SECRET' },
        { id: 4, title: 'Archived', archived: true }
      ] },
      { id: 9, name: 'Old', archived: true, fields: [] }
    ] } as any);
    const text = JSON.stringify(topic);
    expect(text).toContain('image, video');
    expect(text).toContain('Open');
    expect(text).not.toContain('SECRET');
    expect(text).not.toContain('Archived');
    expect(text).not.toContain('"Old"');
    expect(topic.sections[1].id).toBe('form-8-field-1');
  });
});
