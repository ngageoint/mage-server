import { GuideDocument, GuideImage, GuideSection, GuideTopic } from './guide.model';
import { MageEvent, FormField } from '../entities/event/entities.event';

export interface GuideOverride {
  hidden?: boolean;
  title?: string;
  body?: string[];
  steps?: string[];
  /** Source text at the time of editing; never overwrites the administrator's text. */
  source?: string;
  images?: GuideImageOverride[];
}
export interface GuideImageOverride extends Omit<GuideImage, 'dataUrl'> {
  assetId?: string;
  generatedIndex?: number;
  /** Hydrated only in the browser; never persisted in settings. */
  dataUrl?: string;
}
export interface GuideCustomizationState {
  revision: number;
  overrides: Record<string, GuideOverride>;
}
export const emptyGuideCustomizations = (): GuideCustomizationState => ({ revision: 0, overrides: {} });

export function guideNodeKey(topic: GuideTopic, section?: GuideSection): string {
  return section ? `${topic.id}/${section.id || section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : topic.id;
}

export function guideSource(node: GuideTopic | GuideSection): string {
  return JSON.stringify('summary' in node
    ? [node.title, node.summary]
    : [node.title, node.body, node.steps]);
}

/** A deterministic overlay: the generated source is never mutated or replaced. */
export function applyGuideCustomizations(doc: GuideDocument, state: GuideCustomizationState): GuideDocument {
  const overrides = state.overrides || {};
  const topics = doc.topics.filter(t => !overrides[guideNodeKey(t)]?.hidden).map(topic => {
    const change = overrides[guideNodeKey(topic)];
    let stale = !!change?.source && change.source !== guideSource(topic);
    const sections = topic.sections.filter(s => !overrides[guideNodeKey(topic, s)]?.hidden).map(section => {
      const edit = overrides[guideNodeKey(topic, section)];
      stale ||= !!edit?.source && edit.source !== guideSource(section);
      // Rewritten steps must not mislabel old pictures with different step numbers.
      const movedPictures = edit?.steps !== undefined && JSON.stringify(edit.steps) !== JSON.stringify(section.steps);
      return {
        ...section,
        title: edit?.title ?? section.title,
        body: edit?.body ?? section.body,
        steps: edit?.steps ?? section.steps,
        images: edit?.images !== undefined ? edit.images.map(image => ({
          ...image, dataUrl: image.assetId ? image.dataUrl! : section.images?.[image.generatedIndex!]?.dataUrl!
        })).filter(image => !!image.dataUrl)
          : movedPictures ? section.images?.map(i => ({ ...i, afterStep: 0 })) : section.images
      };
    });
    return {
      ...topic, title: change?.title ?? topic.title,
      summary: change?.body ? change.body.join('\n\n') : topic.summary, sections,
      needsReview: topic.needsReview || stale,
      changedSources: stale ? [...topic.changedSources, 'Generated text changed beneath an administrator edit'] : topic.changedSources
    };
  });
  return { ...doc, edition: `${doc.edition}-custom-${state.revision}`, topics };
}

const FIELD_HELP: Record<string, string> = {
  attachment: 'Upload files. Allowed attachment categories and required counts are controlled by this field configuration.',
  checkbox: 'Record a yes/no choice.',
  date: 'Choose a date and time.',
  dropdown: 'Choose one predetermined answer. A configured map symbology field can use this answer to choose a non-default icon.',
  radio: 'Choose one predetermined answer.',
  multiselectdropdown: 'Choose multiple predetermined answers.',
  numberfield: 'Enter a numeric value.',
  email: 'Enter an email address.',
  geometry: 'Record a location or geometry.',
  hidden: 'This field is hidden in the observation entry screen.',
  password: 'Enter protected text. Saved values and defaults are never copied into this guide.',
  userDropdown: 'Select an event member. Actual member names and saved selections are not copied into this guide.',
  textfield: 'Enter a short text answer.',
  textarea: 'Enter a longer text answer.'
};

function fieldBody(field: FormField): string[] {
  const body = [FIELD_HELP[field.type] || `Use this ${field.type} field as configured by your administrator.`,
    field.required ? 'An answer is required.' : 'An answer is optional.'];
  if (field.type === 'attachment') body.push(`Allowed categories: ${(field.allowedAttachmentTypes || []).join(', ') || 'as configured in the form'}.`);
  if ('multiselect' in field && field.multiselect === true) body.push('This field allows multiple selections.');
  const limits = field as FormField & { min?: number; max?: number };
  for (const limit of ['min', 'max'] as const) {
    if (typeof limits[limit] === 'number') body.push(`${limit === 'min' ? 'Minimum' : 'Maximum'}: ${limits[limit]}.`);
  }
  if (['dropdown', 'radio', 'multiselectdropdown'].includes(field.type) && field.choices?.length) {
    body.push(`Available answers: ${field.choices.map(c => c.title).join('; ')}.`);
  }
  return body;
}

/** Event configuration only: no observations, user records, field values or passwords. */
export function eventGuide(event: MageEvent): GuideTopic {
  return {
    id: 'event-forms', title: `Forms for ${event.name}`, summary: 'Generated directly from the current event form definitions. Documentation visibility does not change form behavior or permissions.',
    audience: 'People with access to this event', icon: 'dynamic_form', route: 'Event forms',
    needsReview: false, changedSources: [], controls: [],
    sections: (event.forms || []).filter(f => !f.archived).flatMap(form => [
      { id: `form-${form.id}`, title: form.name, body: [form.description || 'Select this form when creating an observation.',
        form.default ? 'This form is added to new observations automatically.' : 'Select this form explicitly when creating an observation.'], steps: [] },
      ...(form.fields || []).filter(f => !f.archived).map(field => ({
        id: `form-${form.id}-field-${field.id}`, title: `${form.name} — ${field.title}`,
        body: fieldBody(field), steps: []
      }))
    ])
  };
}
