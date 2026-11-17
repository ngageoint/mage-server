/* Each picture names a real route and exercises the same controls as a reader.
 * Assertions fail capture instead of publishing a blank or wrong screen. */
const clickText = text => `(() => {
  const el=[...document.querySelectorAll('button,a')].find(el=>el.textContent.trim()===${JSON.stringify(text)});
  if(!el) throw new Error('Missing control: '+${JSON.stringify(text)}); el.click();
})()`;
const click = selector => `(() => {
  const el=document.querySelector(${JSON.stringify(selector)});
  if(!el) throw new Error('Missing control: '+${JSON.stringify(selector)}); el.click();
})()`;
const fieldScene = (id, title) => ({
  id: `field-${id}`, route: '/admin/events/1/forms/1', steps: [
    click('button[aria-label="Toggle fields section"]'),
    click('mage-fields-list .section-footer-actions button'),
    click('mat-select[name="fieldType"]'),
    `(() => {
      const option=[...document.querySelectorAll('mat-option')].find(el=>el.textContent.trim()===${JSON.stringify(title)});
      if(!option) throw new Error('Missing field choice: '+${JSON.stringify(title)});
      option.click();
    })()`
  ], expect: 'mat-dialog-container', text: 'Add New Field'
});
module.exports = { scenes: [
  { id: 'guide-customization', route: '/help', steps: [click('button.customize-guide')],
    expect: 'mage-guide-editor', text: 'Guide content for everyone' },
  { id: 'form-observation-feed', route: '/admin/events/1/forms/1', steps: [
    click('button[aria-label="Toggle feed section"]'),
    `document.querySelector('button[aria-label="Toggle feed section"]').closest('mat-card').scrollIntoView({block:'start'})`
  ], expect: 'mat-select[name="primaryFeedField"]', text: 'Secondary Field' },
  { id: 'about-guide', route: '/about', steps: [
    `(() => {
      const link=document.querySelector('a[aria-label="Open the user guide in a new tab"]');
      if(!link || link.target!=='_blank' || !link.rel.includes('noopener')) throw new Error('About guide must open safely in a new tab');
      link.scrollIntoView({block:'center'});
    })()`
  ], text: 'Open user guide' },
  { id: 'about-guide-maintenance', route: '/about', steps: [
    click('mage-guide-maintenance summary'),
    `document.querySelector('mage-guide-maintenance').scrollIntoView({block:'start'})`
  ], expect: 'mage-guide-maintenance details[open]', text: 'For developers: no AI required' },
  { id: 'about-guide-maintenance-mobile', route: '/about', viewport: { width: 390, height: 844 }, steps: [
    click('mage-guide-maintenance summary'),
    `(() => {
      const content = document.querySelector('mage-guide-maintenance');
      content.scrollIntoView({block:'start'});
      if(content.scrollWidth > content.clientWidth + 1) throw new Error('Guide explanation overflows on a narrow screen');
      const scroll = document.querySelector('about .container');
      if(!scroll || scroll.scrollHeight <= scroll.clientHeight) throw new Error('About page must scroll to the full explanation');
    })()`
  ], expect: 'mage-guide-maintenance details[open]', text: 'For developers: no AI required' },
  { id: 'overview-map', route: '/home', expect: 'map-control-add-observation', text: 'Training Event' },
  { id: 'map-layer-list', route: '/home', steps: [click('map-control-layers button')],
    text: 'OpenStreetMap' },
  { id: 'observation-create', route: '/home', steps: [click('[data-guide="map.create"]')], text: 'Save' },
  { id: 'map-filter', route: '/home', steps: [click('[data-guide="map.filter"]')], text: 'Filter' },
  { id: 'users-list', route: '/admin/users', expect: 'admin-users', text: 'Example User' },
  { id: 'user-create', route: '/admin/users', steps: [click('[data-guide="users.new"]')], text: 'New User' },
  { id: 'user-details', route: '/admin/users/guide-user', text: 'Example User' },
  { id: 'form-details', route: '/admin/events/1', steps: [
    `document.querySelector('[data-guide-label="forms.new"]').closest('mat-card').scrollIntoView({block:'center'})`
  ], text: 'Create Form' },
  { id: 'form-create', route: '/admin/events/1/forms/new', text: 'Next: Add Fields' },
  { id: 'form-fields', route: '/admin/events/1/forms/1', steps: [
    click('button[aria-label="Toggle fields section"]'),
    `document.querySelector('mage-fields-list').closest('mat-card').scrollIntoView({block:'start'})`
  ], expect: 'mage-fields-list', text: 'Report title' },
  ...[
    ['text', 'Text'], ['textarea', 'Text Area'], ['number', 'Number'],
    ['email', 'Email'], ['date', 'Date'], ['checkbox', 'Checkbox'],
    ['radio', 'Radio Buttons'], ['select', 'Select'], ['location', 'Location'],
    ['attachment', 'Attachment'], ['user', 'User Select']
  ].map(([id, title]) => fieldScene(id, title)),
  { id: 'form-symbology', route: '/admin/events/1/forms/1', steps: [
    click('button[aria-label="Toggle map section"]'),
    `document.querySelector('button[aria-label="Toggle map section"]').closest('mat-card').scrollIntoView({block:'start'})`
  ], text: 'Primary Field' },
  { id: 'layers-list', route: '/admin/layers', expect: 'mage-layer-dashboard' },
  { id: 'layer-create', route: '/admin/layers', steps: [click('[data-guide="layers.new"]')], text: 'Layer' },
  { id: 'feeds-list', route: '/admin/feeds', text: 'Feeds' },
  { id: 'feed-configure', route: '/admin/feeds/new', text: 'Choose a Service' }
] };
