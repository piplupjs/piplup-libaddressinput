import { describe, expect, it } from 'vitest';

import { en } from '../messages/en.js';

import { getFieldLabel, DEFAULT_FIELD_LABEL_IDS } from './labels.js';

import type { LayoutField } from '../layout.js';

describe('ui/labels', () => {
  it('resolves default field labels from AddressField', () => {
    expect(getFieldLabel('LOCALITY')).toBe('City');
    expect(getFieldLabel('ADMIN_AREA')).toBe('State / Province');
    expect(getFieldLabel('POSTAL_CODE')).toBe('Postal code');
    expect(getFieldLabel('STREET_ADDRESS')).toBe('Street address');
    expect(getFieldLabel('ORGANIZATION')).toBe('Organization');
    expect(getFieldLabel('RECIPIENT')).toBe('Name');
    expect(getFieldLabel('COUNTRY')).toBe('Country / Region');
    expect(getFieldLabel('SORTING_CODE')).toBe('CEDEX');
  });

  it('resolves labels from LayoutField with explicit labelId', () => {
    const fieldWithCustomLabel: LayoutField = {
      field: 'ADMIN_AREA',
      kind: 'field',
      labelId: 'STATE',
      length: 'short',
      multiline: false,
      required: true,
    };
    expect(getFieldLabel(fieldWithCustomLabel)).toBe('State');

    const pinCodeField: LayoutField = {
      field: 'POSTAL_CODE',
      kind: 'field',
      labelId: 'PIN_CODE_LABEL',
      length: 'short',
      multiline: false,
      required: true,
    };
    expect(getFieldLabel(pinCodeField)).toBe('PIN code');
  });

  it('resolves CEDEX for SORTING_CODE LayoutField', () => {
    const cedexField: LayoutField = {
      field: 'SORTING_CODE',
      kind: 'field',
      labelId: 'CEDEX',
      length: 'short',
      multiline: false,
      required: false,
    };
    expect(getFieldLabel(cedexField)).toBe('CEDEX');
  });

  it('falls back cleanly when labelId is undefined on LayoutField', () => {
    const standardLocalityField: LayoutField = {
      field: 'LOCALITY',
      kind: 'field',
      labelId: undefined,
      length: 'short',
      multiline: false,
      required: true,
    };
    expect(getFieldLabel(standardLocalityField)).toBe('City');
  });

  it('supports custom language dictionary', () => {
    const frenchMessages: Record<string, string> = {
      ...en,
      LOCALITY_LABEL: 'Ville',
      POSTAL_CODE_LABEL: 'Code postal',
      PROVINCE: 'Province',
    };
    expect(getFieldLabel('LOCALITY', frenchMessages)).toBe('Ville');
    expect(getFieldLabel('POSTAL_CODE', frenchMessages)).toBe('Code postal');
  });

  it('has valid DEFAULT_FIELD_LABEL_IDS for all address fields', () => {
    expect(DEFAULT_FIELD_LABEL_IDS.LOCALITY).toBe('LOCALITY_LABEL');
    expect(DEFAULT_FIELD_LABEL_IDS.ADMIN_AREA).toBe('PROVINCE');
    expect(DEFAULT_FIELD_LABEL_IDS.POSTAL_CODE).toBe('POSTAL_CODE_LABEL');
  });
});
