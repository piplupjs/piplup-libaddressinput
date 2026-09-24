import type { AddressField } from "../address-field.js";
import type { LayoutField } from "../layout.js";
import type { MessageId } from "../messages.js";
import { en as defaultMessages } from "../messages/en.js";
import { en as defaultLabels } from "../labels/en.js";

/**
 * Standard fallback message IDs for fields whose region rules do not specify
 * an explicit name type (e.g. standard "City", "Postal code", etc.).
 * These IDs map to localized strings in message packs (e.g. messages/en.ts).
 */
export const DEFAULT_FIELD_LABEL_IDS: Record<AddressField, MessageId | "CEDEX"> = {
  ADMIN_AREA: "PROVINCE",
  LOCALITY: "LOCALITY_LABEL",
  DEPENDENT_LOCALITY: "DISTRICT",
  POSTAL_CODE: "POSTAL_CODE_LABEL",
  STREET_ADDRESS: "ADDRESS_LINE_1_LABEL",
  ORGANIZATION: "ORGANIZATION_LABEL",
  RECIPIENT: "RECIPIENT_LABEL",
  COUNTRY: "COUNTRY_OR_REGION_LABEL",
  SORTING_CODE: "CEDEX",
};

export interface GetFieldLabelOptions {
  /** Localized message pack for rule-specific labels (e.g. "PIN_CODE_LABEL" -> "PIN code"). */
  messages?: Record<string, string>;
  /** Localized label pack for default field names (e.g. "LOCALITY" -> "City"). */
  labels?: Partial<Record<AddressField, string>>;
}

function isOptionsObject(
  options?: GetFieldLabelOptions | Record<string, string>,
): options is GetFieldLabelOptions {
  return typeof options === "object" && options !== null && ("messages" in options || "labels" in options);
}

/**
 * Resolves a human-friendly label for any LayoutField or AddressField.
 * Automatically checks rule-specific labels (e.g. "Prefecture", "Oblast", "Eircode", "PIN code"),
 * falling back to default field labels (e.g. "City", "State / Province", "Postal code").
 *
 * @param field The LayoutField from buildLayout() or bare AddressField enum.
 * @param options Custom message and/or label packs (defaults to bundled English packs).
 */
export function getFieldLabel(
  field: LayoutField | AddressField,
  options?: GetFieldLabelOptions | Record<string, string>,
): string {
  const addressField = typeof field === "string" ? field : field.field;

  let messages: Record<string, string>;
  let labels: Partial<Record<AddressField, string>> | undefined;

  if (options === undefined) {
    messages = defaultMessages;
    labels = defaultLabels;
  } else if (isOptionsObject(options)) {
    messages = options.messages ?? defaultMessages;
    labels = options.labels ?? (options.messages ? undefined : defaultLabels);
  } else {
    // Caller passed a raw messages dictionary directly (e.g. frenchMessages)
    messages = options;
    labels = undefined;
  }

  // 1. If an explicit custom labels pack was passed, check it first
  if (isOptionsObject(options) && options.labels?.[addressField] !== undefined) {
    return options.labels[addressField];
  }

  // 2. If LayoutField has an explicit rule-specific label ID (e.g. "STATE", "PIN_CODE_LABEL", "CEDEX")
  if (typeof field !== "string") {
    if (field.labelId === "CEDEX") {
      return "CEDEX";
    }
    if (field.labelId !== undefined) {
      const explicit = messages[field.labelId];
      if (explicit !== undefined) return explicit;
    }
  }

  // 2. If a label pack is provided, check for a default field label (e.g. "State / Province")
  if (labels !== undefined) {
    const label = labels[addressField];
    if (label !== undefined) return label;
  }

  // 3. Fall back to the default message ID in the messages dictionary (e.g. "LOCALITY_LABEL" -> "Ville")
  const defaultId = DEFAULT_FIELD_LABEL_IDS[addressField];
  if (defaultId === "CEDEX") return "CEDEX";
  const defaultMsg = messages[defaultId];
  if (defaultMsg !== undefined) {
    return defaultMsg;
  }

  return addressField;
}
