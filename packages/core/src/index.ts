export type { AddressData } from './address-data.js';
export { createAddressData, getFieldValue, isFieldEmpty } from './address-data.js';
export type { AddressField } from './address-field.js';
export { ADDRESS_FIELDS, isAddressField } from './address-field.js';
export type {
  AddressFormController,
  AddressFormOptions,
  AddressFormState,
  FormField,
} from './form/controller.js';
export { createAddressForm } from './form/controller.js';
export {
  formatAddress,
  formatAddressAsSingleLine,
  getStreetAddressLinesAsSingleLine,
} from './formatter.js';
export type {
  AddressLayout,
  BuildLayoutOptions,
  LayoutField,
  LayoutLiteral,
  LayoutRowItem,
} from './layout.js';
export { buildLayout, getRegionCodes } from './layout.js';
export type { GetProblemMessageOptions, MessageId, ProblemMessage } from './messages.js';
export {
  formatMessage,
  formatProblemMessage,
  getFieldLabelId,
  getProblemMessage,
} from './messages.js';
export { isFieldRequired, isFieldUsed } from './metadata.js';
export { normalize } from './normalizer.js';
export type { AddressProblem } from './problem.js';
export { ADDRESS_PROBLEMS } from './problem.js';
export type { BuildRegionTreeResult, RegionData } from './region-data.js';
export { buildRegionTree } from './region-data.js';
export type { FetchSourceOptions, Source, SourceResult } from './source.js';
export { FallbackAggregateSource, FetchSource, HybridSource } from './source.js';
export type { Storage, StorageResult } from './storage.js';
export { MemoryStorage, NullStorage } from './storage.js';
export { OndemandSupplier } from './supplier/ondemand.js';
export { type LoadRulesResult, PreloadSupplier } from './supplier/preload.js';
export type { RuleHierarchy, Supplier, SupplyResult } from './supplier/supplier.js';
// Headless UI helpers
export {
  DATA_KEY_TO_FIELD,
  DEFAULT_FIELD_LABEL_IDS,
  FIELD_TO_AUTOCOMPLETE,
  FIELD_TO_DATA_KEY,
  findSubRegions,
  formatRegionOption,
  getFieldAutocomplete,
  getFieldKey,
  getFieldLabel,
  getProblemErrorMessage,
  getRegionOptions,
  getUserProblems,
  groupProblemsByField,
  isUserProblem,
  type RegionOption,
} from './ui/index.js';
export type { ValidateOptions, ValidationProblem } from './validator.js';

export { validate } from './validator.js';
