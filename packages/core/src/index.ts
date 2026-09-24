export type { AddressData } from "./address-data.js";
export { createAddressData, getFieldValue, isFieldEmpty } from "./address-data.js";
export type { AddressField } from "./address-field.js";
export { ADDRESS_FIELDS, isAddressField } from "./address-field.js";
export type { AddressProblem } from "./problem.js";
export { ADDRESS_PROBLEMS } from "./problem.js";
export {
  formatAddress,
  formatAddressAsSingleLine,
  getStreetAddressLinesAsSingleLine,
} from "./formatter.js";
export { isFieldRequired, isFieldUsed } from "./metadata.js";
export { normalize } from "./normalizer.js";
export type { RegionData, BuildRegionTreeResult } from "./region-data.js";
export { buildRegionTree } from "./region-data.js";
export type { ValidateOptions, ValidationProblem } from "./validator.js";
export { validate } from "./validator.js";
export type { Source, SourceResult, FetchSourceOptions } from "./source.js";
export { FetchSource, FallbackAggregateSource, HybridSource } from "./source.js";
export type { Storage, StorageResult } from "./storage.js";
export { MemoryStorage, NullStorage } from "./storage.js";
export type { Supplier, RuleHierarchy, SupplyResult } from "./supplier/supplier.js";
export { PreloadSupplier, type LoadRulesResult } from "./supplier/preload.js";
export { OndemandSupplier } from "./supplier/ondemand.js";
export type {
  AddressLayout,
  LayoutField,
  LayoutLiteral,
  LayoutRowItem,
  BuildLayoutOptions,
} from "./layout.js";
export { buildLayout, getRegionCodes } from "./layout.js";
export type { MessageId, ProblemMessage, GetProblemMessageOptions } from "./messages.js";
export {
  getFieldLabelId,
  getProblemMessage,
  formatMessage,
  formatProblemMessage,
} from "./messages.js";
export type {
  AddressFormState,
  AddressFormOptions,
  AddressFormController,
  FormField,
} from "./form/controller.js";
export { createAddressForm } from "./form/controller.js";

// Headless UI helpers
export {
  DEFAULT_FIELD_LABEL_IDS,
  getFieldLabel,
  FIELD_TO_DATA_KEY,
  DATA_KEY_TO_FIELD,
  FIELD_TO_AUTOCOMPLETE,
  getFieldKey,
  getFieldAutocomplete,
  isUserProblem,
  getUserProblems,
  getProblemErrorMessage,
  groupProblemsByField,
  type RegionOption,
  getRegionOptions,
  formatRegionOption,
  findSubRegions,
} from "./ui/index.js";
