import { GuideDocument } from './guide.model';
import { renderGuideHtml, escapeHtml } from './guide-export';

const doc: GuideDocument = {
  version: '6.5.0', edition: 'Server',
  topics: [
    { id: 'a', title: 'Map <b>', summary: 'S', audience: 'Everyone', icon: 'map', route: '/home',
      needsReview: true, changedSources: ['x.html'], controls: [{ id: 'c', label: 'Add', icon: 'add_location' }],
      sections: [{ title: 'T', body: ['<script>alert(1)</script>'], steps: ['Click'] }] },
    { id: 'b', title: 'Admin', summary: 'S2', audience: 'Admins', icon: 'admin_panel_settings', route: '/admin',
      needsReview: false, changedSources: [], controls: [], sections: [] }
  ]
};

describe('guide export', () => {
  it('escapes content', () => {
    const html = renderGuideHtml(doc);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(escapeHtml('"&\'')).toBe('&quot;&amp;&#39;');
  });

  it('is self-contained with toc and icons, without source-review notices', () => {
    const html = renderGuideHtml(doc);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).toContain('Contents');
    expect(html).toContain('[add location]');
    expect(html).not.toContain('Source review needed');
    expect(html).not.toContain('needs source review');
  });

  it('exports a single chapter', () => {
    const html = renderGuideHtml(doc, 'b');
    expect(html).toContain('Admin');
    expect(html).not.toContain('Map &lt;b&gt;');
  });

  it('embeds pictures at their instruction step and escapes captions', () => {
    const pictured = JSON.parse(JSON.stringify(doc)) as GuideDocument;
    pictured.topics[0].sections[0].images = [{
      afterStep: 1, dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
      alt: 'Form "details"', caption: 'Next <screen>'
    }];
    const html = renderGuideHtml(pictured, 'a');
    expect(html).toContain('<li>Click<figure');
    expect(html).toContain('src="data:image/svg+xml;base64,PHN2Zy8+"');
    expect(html).toContain('alt="Form &quot;details&quot;"');
    expect(html).toContain('Next &lt;screen&gt;');
    pictured.topics[0].sections[0].images[0].dataUrl = 'https://example.invalid/picture.svg';
    expect(() => renderGuideHtml(pictured)).toThrowError(/embedded offline/);
  });

  it('places uploaded screenshots between paragraphs and at steps, including shortened text', () => {
    const pictured = JSON.parse(JSON.stringify(doc)) as GuideDocument;
    const s = pictured.topics[0].sections[0];
    s.body = ['First paragraph', 'Second paragraph'];
    s.images = [{ afterStep: 0, afterParagraph: 1, dataUrl: 'data:image/png;base64,AAAA', alt: 'Workflow', caption: 'After first' },
      { afterStep: 1, dataUrl: 'data:image/png;base64,AAAA', alt: 'Saved', caption: 'After click' }];
    const html = renderGuideHtml(pictured, 'a');
    expect(html.indexOf('First paragraph')).toBeLessThan(html.indexOf('After first'));
    expect(html.indexOf('After first')).toBeLessThan(html.indexOf('Second paragraph'));
    expect(html).toContain('<li>Click<figure');
    s.body = [];
    s.steps = [];
    const shorter = renderGuideHtml(pictured, 'a');
    expect(shorter).toContain('After first');
    expect(shorter).toContain('After click');
  });
});
