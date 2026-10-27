import type { DraftKind } from '../types';
import type { DraftContext } from './common';
import { emailAnnouncement } from './email-announcement';
import { immediateMessage } from './immediate-message';

export type { DraftContext, TemplateLocale } from './common';
export { emailSubject } from './email-announcement';

/** Brouillon proposé pour un type de brouillon, à partir des réponses du dossier. */
export function draftFor(kind: DraftKind, ctx: DraftContext): string {
  return kind === 'whatsapp' ? immediateMessage(ctx) : emailAnnouncement(ctx);
}
