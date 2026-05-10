'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonContainer } from '@/components/ui/ButtonContainer';
import { ButtonText } from '@/components/ui/ButtonText';
import { PopupCard, PopupHeader } from './PopupCard';

export interface TestimonialFormValues {
  memorialId?: string;
  memorialName?: string;
  message: string;
  relationship: string;
}

type Relation =
  | 'parent'
  | 'spouse'
  | 'partner'
  | 'child'
  | 'friend'
  | 'colleague'
  | 'other'
  | 'undisclosed';

const RELATION_KEYS: Relation[] = [
  'parent',
  'spouse',
  'partner',
  'child',
  'friend',
  'colleague',
  'other',
  'undisclosed',
];

interface MyTestimonialCreateModalProps {
  open: boolean;
  onClose: () => void;
  authorAvatarUrl?: string | null;
  authorName?: string;
  preselectedMemorial?: { id: string; name: string; coverUrl?: string | null };
  onSubmit: (values: TestimonialFormValues) => Promise<void> | void;
  submitting?: boolean;
}

/**
 * V2 popup "My Testimonial — Create a new" (PDF p05/p14/p20).
 */
export function MyTestimonialCreateModal({
  open,
  onClose,
  authorAvatarUrl,
  authorName,
  preselectedMemorial,
  onSubmit,
  submitting = false,
}: MyTestimonialCreateModalProps) {
  const t = useTranslations('popups.testimonialCreate');
  const tRel = useTranslations('popups.testimonialCreate.relations');
  const [message, setMessage] = useState('');
  const [relationship, setRelationship] = useState<Relation>('friend');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !preselectedMemorial?.id || submitting) return;
    await onSubmit({
      memorialId: preselectedMemorial.id,
      memorialName: preselectedMemorial.name,
      message: message.trim(),
      relationship,
    });
    setMessage('');
  }

  return (
    <PopupCard open={open} onClose={onClose} ariaLabel={t('ariaLabel')} width="lg">
      <div className="space-y-5">
        <PopupHeader scriptTitle={t('scriptTitle')} subtitle={t('subtitle')} />

        <div className="flex justify-center">
          <Avatar src={authorAvatarUrl} name={authorName} size="lg" />
        </div>

        {preselectedMemorial && (
          <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
            <Avatar
              src={preselectedMemorial.coverUrl}
              name={preselectedMemorial.name}
              size="sm"
              border="rose"
            />
            <p className="flex-1 truncate font-display text-sm font-semibold text-foreground">
              {preselectedMemorial.name}
            </p>
            <ButtonText variant="action" type="button" onClick={onClose}>
              {t('delete')}
            </ButtonText>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              {t('memorablePrompt')}
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('sharePlaceholder')}
              required
              rows={5}
              className="mt-1 block w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
            />
          </label>

          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              {t('relationshipLabel')}
            </span>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as Relation)}
              className="mt-1 block w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
            >
              {RELATION_KEYS.map((key) => (
                <option key={key} value={key}>
                  {tRel(key)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-center pt-2">
            <ButtonContainer
              type="submit"
              loading={submitting}
              disabled={!message.trim() || !preselectedMemorial?.id}
            >
              {submitting ? t('posting') : t('submit')}
            </ButtonContainer>
          </div>
        </form>
      </div>
    </PopupCard>
  );
}
