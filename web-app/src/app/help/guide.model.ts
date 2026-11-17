export interface GuideControl {
  id: string;
  label: string;
  icon: string;
}

export interface GuideImage {
  /** Zero is the initial screen; positive values follow the numbered step. */
  afterStep: number;
  dataUrl: string;
  alt: string;
  caption: string;
  /** When present, place after this paragraph (zero means before text). */
  afterParagraph?: number;
}

export interface GuideSection {
  id?: string;
  title: string;
  body: string[];
  steps: string[];
  images?: GuideImage[];
}

/** Keep images visible if an administrator later removes their paragraph/step. */
export function guideImagePosition(image: GuideImage, section: GuideSection): string {
  if (image.afterParagraph !== undefined) return `paragraph:${Math.min(image.afterParagraph, section.body.length)}`;
  if (image.afterStep > 0 && image.afterStep <= section.steps.length) return `step:${image.afterStep}`;
  return `paragraph:${section.body.length}`;
}

export interface GuideTopic {
  id: string;
  title: string;
  summary: string;
  audience: string;
  icon: string;
  route: string;
  needsReview: boolean;
  changedSources: string[];
  controls: GuideControl[];
  sections: GuideSection[];
}

export interface GuideDocument {
  version: string;
  edition: string;
  topics: GuideTopic[];
}
