import { Field } from './observation-feed-helper';

export interface FormLike {
    fields?: Field[];
    userFields?: string[];
}

export function isUserFieldType(field?: Field): boolean {
    if (!field) return false;
    return field.type === 'userDropdown' || field.type === 'multiSelectUserDropdown';
}

export function deriveUserFieldNames(fields?: Field[]): string[] {
    if (!Array.isArray(fields)) return [];

    const names = fields
        .filter(field => isUserFieldType(field) && !!field?.name)
        .map(field => field.name as string);

    return Array.from(new Set(names));
}

export function decorateFormForDisplay<T extends FormLike>(form: T): T {
    if (!form) return form;

    if (!Array.isArray(form.fields)) {
        form.fields = [];
    }

    if (!Array.isArray(form.userFields)) {
        form.userFields = [];
    }

    const userFieldNames = new Set(form.userFields.filter((name): name is string => !!name));

    form.fields.forEach(field => {
        if (!field) return;

        const name = field.name || '';
        const fieldIsUser = name ? userFieldNames.has(name) : isUserFieldType(field);
        const wasMultiselect = field.multiselect || field.type === 'multiselectdropdown' || field.type === 'multiSelectUserDropdown';

        if (fieldIsUser) {
            if (name) {
                userFieldNames.add(name);
            }
            field.type = 'userDropdown';
            field.multiselect = wasMultiselect;
        } else if (field.type === 'multiselectdropdown') {
            field.type = 'dropdown';
            field.multiselect = true;
        } else if (field.multiselect === undefined) {
            field.multiselect = false;
        }
    });

    form.userFields = Array.from(userFieldNames);
    return form;
}

export function prepareFormPayload<T extends FormLike>(form: T, overrides?: Partial<T>): T {
    const merged: FormLike = {
        ...form,
        ...overrides
    };

    const userFieldNames = new Set(
        (merged.userFields || [])
            .filter((name): name is string => !!name)
    );

    const normalizedFields = (merged.fields || []).map(field => normalizeFieldForPayload(field, userFieldNames));

    return {
        ...merged,
        fields: normalizedFields,
        userFields: Array.from(userFieldNames)
    } as T;
}

function normalizeFieldForPayload(field: Field, userFieldNames: Set<string>): Field {
    if (!field) return field;

    const normalized: Field = { ...field };
    const name = normalized.name || '';
    const explicitUser = isUserFieldType(normalized);
    const isUserField = explicitUser || (name && userFieldNames.has(name));

    if (isUserField && name) {
        userFieldNames.add(name);
        normalized.type = normalized.multiselect ? 'multiselectdropdown' : 'dropdown';
        normalized.choices = [];
    } else if (normalized.type === 'dropdown' && normalized.multiselect) {
        normalized.type = 'multiselectdropdown';
    }

    delete normalized.multiselect;
    return normalized;
}
