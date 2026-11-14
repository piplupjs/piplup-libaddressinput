import type {
  AddressData,
  AddressField,
  MessageId,
  RegionData,
  Supplier,
} from '@piplup/libaddressinput';

export interface SubRegion {
  key: string;
  label: string;
  name: string;
}

export interface FieldMeta {
  autoComplete: string;
  field: AddressField;
  isSelect: boolean;
  key: keyof AddressData;
  label: string;
  length: 'long' | 'short';
  multiline: boolean;
  options?: SubRegion[] | undefined;
  required: boolean;
}

export interface AddressOptions {
  includeLiterals?: boolean;
  labels?: Partial<Record<AddressField, string>>;
  locale?: string;
  messages?: Partial<Record<MessageId, string>>;
  region: string;
  supplier: Supplier;
}

export interface AddressState {
  error: Error | null;
  fields: FieldMeta[];
  getField: (field: AddressField | string) => FieldMeta | undefined;
  loading: boolean;
  region: string;
  rows: FieldMeta[][];
  supplier: Supplier;
  tree: null | RegionData;
}

export interface Country {
  code: string;
  name: string;
}

export interface CountriesOptions {
  locale?: string;
  priority?: string[];
}

export interface SubRegionsOptions {
  parentKey?: string;
  state?: AddressState;
}
