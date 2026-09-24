import type {
  AddressData,
  AddressField,
  MessageId,
  RegionData,
  Supplier,
} from "@piplup/libaddressinput";

export interface SubRegion {
  key: string;
  name: string;
  label: string;
}

export interface FieldMeta {
  field: AddressField;
  key: keyof AddressData;
  label: string;
  required: boolean;
  autoComplete: string;
  options?: SubRegion[] | undefined;
  isSelect: boolean;
  multiline: boolean;
  length: "short" | "long";
}

export interface AddressOptions {
  supplier: Supplier;
  region: string;
  locale?: string;
  labels?: Partial<Record<AddressField, string>>;
  messages?: Partial<Record<MessageId, string>>;
  includeLiterals?: boolean;
}

export interface AddressState {
  region: string;
  rows: FieldMeta[][];
  fields: FieldMeta[];
  tree: RegionData | null;
  loading: boolean;
  error: Error | null;
  supplier: Supplier;
  getField: (field: AddressField | string) => FieldMeta | undefined;
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
