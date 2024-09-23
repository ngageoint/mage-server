export class EventResult {
    name: string;
    id: number;
    forms: FormResult[];
}

export class FormResult {
    name: string;
    id: number;
    fields: FieldResult[];
}

export class FieldResult {
    title: string;
}

export const mockArcGISEventResult = Object.freeze<EventResult>({
  id: 0,
  name: 'test event result name',
  forms: [{
    id: 1,
    name: 'test form result name',
    fields: [{
      title: 'test field'
    }]
  }]
})