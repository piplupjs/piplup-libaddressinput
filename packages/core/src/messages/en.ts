// Port of upstream's English message pack (cpp/messages/en.txt via
// Localization, Apache-2.0 Google Inc.), reshaped as a plain id -> template
// map. See .planning/PLAN.md §6 Phase 6.
//
// STATUS: Phase 6 stub. Not yet implemented.

import type { MessageId } from "../layout.js";

export const en: Record<MessageId, string> = {};

/** Formats a message id + params into an English string. Not yet implemented. */
export function formatMessage(
  _id: MessageId,
  _params?: Record<string, string>,
): string {
  throw new Error("formatMessage: not implemented yet (see .planning/PLAN.md Phase 6)");
}
