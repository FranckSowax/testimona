'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  reorderChaptersAction,
  updateChapterAction,
  deleteChapterAction,
} from '../_actions/biography';
import { ChapterMediaGrid, type ChapterMedia } from './ChapterMediaGrid';

interface ChapterDraft {
  id: string;
  title: string;
  content: string;
  position: number;
  media: ChapterMedia[];
}

interface Props {
  memorialId: string;
  slug: string;
  initialChapters: ChapterDraft[];
}

/**
 * Owner-only management UI for biography chapters: drag-and-drop
 * reorder, inline edit + delete. Uses the native HTML5 drag API so we
 * avoid pulling in dnd-kit / react-beautiful-dnd. On drop we send the
 * full ordered id list to reorderChaptersAction, which rewrites every
 * position field atomically.
 */
export function BiographyChaptersManager({
  memorialId,
  slug,
  initialChapters,
}: Props) {
  const t = useTranslations('memorial.chaptersManager');
  const router = useRouter();
  const [chapters, setChapters] = useState<ChapterDraft[]>(initialChapters);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function onDragStart(id: string) {
    return (e: React.DragEvent<HTMLLIElement>) => {
      setDraggedId(id);
      e.dataTransfer.effectAllowed = 'move';
      // Required for Firefox to fire `drop` events
      try {
        e.dataTransfer.setData('text/plain', id);
      } catch {
        /* ignore — older browsers */
      }
    };
  }

  function onDragOver(id: string) {
    return (e: React.DragEvent<HTMLLIElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (id !== dragOverId) setDragOverId(id);
    };
  }

  function onDragLeave(e: React.DragEvent<HTMLLIElement>) {
    // Only clear when leaving the item entirely, not when entering a child.
    const related = e.relatedTarget as HTMLElement | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    setDragOverId(null);
  }

  function onDrop(targetId: string) {
    return (e: React.DragEvent<HTMLLIElement>) => {
      e.preventDefault();
      const sourceId =
        draggedId ?? (e.dataTransfer.getData('text/plain') || null);
      setDraggedId(null);
      setDragOverId(null);
      if (!sourceId || sourceId === targetId) return;

      const fromIndex = chapters.findIndex((c) => c.id === sourceId);
      const toIndex = chapters.findIndex((c) => c.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return;

      const next = [...chapters];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return;
      next.splice(toIndex, 0, moved);
      setChapters(next);
      persistOrder(next.map((c) => c.id));
    };
  }

  function move(id: string, direction: -1 | 1) {
    const idx = chapters.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= chapters.length) return;
    const next = [...chapters];
    const a = next[idx]!;
    const b = next[target]!;
    next[idx] = b;
    next[target] = a;
    setChapters(next);
    persistOrder(next.map((c) => c.id));
  }

  // After a redeploy Next.js may invalidate the hashed server-action IDs
  // that the loaded client bundle still references. Detect that error and
  // force a hard reload so the user picks up the new bundle.
  function isStaleActionError(err: unknown): boolean {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : '';
    return /Server Action|UnrecognizedActionError|was not found on the server/i.test(
      msg,
    );
  }

  function persistOrder(orderedIds: string[]) {
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await reorderChaptersAction(memorialId, slug, orderedIds);
        if (result?.error) {
          setFeedback({ kind: 'error', text: result.error });
          router.refresh();
          return;
        }
        setFeedback({ kind: 'ok', text: t('orderSaved') });
        router.refresh();
        setTimeout(() => setFeedback(null), 2200);
      } catch (err) {
        if (isStaleActionError(err)) {
          window.location.reload();
          return;
        }
        setFeedback({
          kind: 'error',
          text: t('saveFailed'),
        });
      }
    });
  }

  async function submitEdit(
    id: string,
    title: string,
    content: string,
    keptMedia: ChapterMedia[],
    newFiles: File[],
  ) {
    setFeedback(null);
    const fd = new FormData();
    fd.set('id', id);
    fd.set('memorialId', memorialId);
    fd.set('slug', slug);
    fd.set('title', title);
    fd.set('content', content);
    fd.set('existingMedia', JSON.stringify(keptMedia));
    for (const file of newFiles) fd.append('media', file);
    try {
      const result = await updateChapterAction(null, fd);
      if (result?.error) {
        setFeedback({ kind: 'error', text: result.error });
        return false;
      }
      // Title/content update optimistically; media (new upload URLs) comes back
      // via the refresh below.
      setChapters((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title, content } : c)),
      );
      setEditingId(null);
      router.refresh();
      return true;
    } catch (err) {
      if (isStaleActionError(err)) {
        window.location.reload();
        return false;
      }
      setFeedback({ kind: 'error', text: t('editFailed') });
      return false;
    }
  }

  async function submitDelete(id: string) {
    setFeedback(null);
    const fd = new FormData();
    fd.set('id', id);
    fd.set('memorialId', memorialId);
    fd.set('slug', slug);
    try {
      const result = await deleteChapterAction(null, fd);
      if (result?.error) {
        setFeedback({ kind: 'error', text: result.error });
        return;
      }
      setChapters((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } catch (err) {
      if (isStaleActionError(err)) {
        window.location.reload();
        return;
      }
      setFeedback({ kind: 'error', text: t('deleteFailed') });
    }
  }

  if (chapters.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('title')}
        </p>
        <p className="text-[11px] italic text-muted-foreground">
          {t('hint')}
        </p>
      </div>

      <ul className="space-y-2">
        {chapters.map((c, index) => {
          const isDragging = draggedId === c.id;
          const isDragOver = dragOverId === c.id && draggedId !== c.id;
          const isEditing = editingId === c.id;
          return (
            <li
              key={c.id}
              draggable={!isEditing}
              onDragStart={onDragStart(c.id)}
              onDragOver={onDragOver(c.id)}
              onDragLeave={onDragLeave}
              onDrop={onDrop(c.id)}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              className={[
                'group relative rounded-lg border bg-white transition-all',
                isDragging ? 'opacity-50' : 'opacity-100',
                isDragOver
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border',
                isEditing ? '' : 'cursor-grab active:cursor-grabbing',
              ].join(' ')}
            >
              {isEditing ? (
                <ChapterEditForm
                  initialTitle={c.title}
                  initialContent={c.content}
                  initialMedia={c.media ?? []}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(title, content, keptMedia, newFiles) =>
                    submitEdit(c.id, title, content, keptMedia, newFiles)
                  }
                />
              ) : (
                <div className="flex items-start gap-2 p-3 sm:p-4">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground"
                    title={t('dragHandle')}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <circle cx="9" cy="6" r="1.5" />
                      <circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" />
                      <circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" />
                      <circle cx="15" cy="18" r="1.5" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2">
                      <span className="font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="truncate font-display text-base font-bold text-foreground">
                        {c.title}
                      </span>
                    </p>
                    {c.content && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {c.content}
                      </p>
                    )}
                    {c.media && c.media.length > 0 && (
                      <>
                        <p className="mt-1 text-xs text-muted-foreground">
                          📎 {t('mediaCount', { count: c.media.length })}
                        </p>
                        {/* Client recette: owners must SEE the chapter photos in
                            the admin list too, not just a count. */}
                        <ChapterMediaGrid media={c.media} />
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-60 group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label={t('moveUp')}
                      disabled={index === 0 || isPending}
                      onClick={() => move(c.id, -1)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label={t('moveDown')}
                      disabled={index === chapters.length - 1 || isPending}
                      onClick={() => move(c.id, 1)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label={t('editChapter')}
                      onClick={() => setEditingId(c.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label={t('deleteChapter')}
                      onClick={() => {
                        if (
                          window.confirm(
                            t('confirmDelete', { title: c.title }),
                          )
                        ) {
                          void submitDelete(c.id);
                        }
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {feedback && (
        <p
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={[
            'text-xs',
            feedback.kind === 'error' ? 'text-destructive' : 'text-primary',
          ].join(' ')}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}

const MAX_CHAPTER_MEDIA = 10;
const MEDIA_ACCEPT =
  'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime';

function ChapterEditForm({
  initialTitle,
  initialContent,
  initialMedia,
  onCancel,
  onSubmit,
}: {
  initialTitle: string;
  initialContent: string;
  initialMedia: ChapterMedia[];
  onCancel: () => void;
  onSubmit: (
    title: string,
    content: string,
    keptMedia: ChapterMedia[],
    newFiles: File[],
  ) => Promise<boolean>;
}) {
  const t = useTranslations('memorial.chaptersManager');
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [kept, setKept] = useState<ChapterMedia[]>(initialMedia);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const totalMedia = kept.length + newFiles.length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tt = title.trim();
    if (!tt) return;
    startTransition(async () => {
      await onSubmit(tt, content.trim(), kept, newFiles);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-3 sm:p-4">
      <label className="block">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('fieldTitle')}
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
        />
      </label>
      <label className="block">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('fieldContent')}
        </span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          maxLength={5000}
          className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-base text-foreground focus:border-primary focus:outline-none sm:text-sm"
        />
      </label>

      {/* Media: view/remove existing, add new. */}
      <div className="rounded-md border border-dashed border-border bg-surface p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs italic text-muted-foreground">
            {t('mediaCount', { count: totalMedia })}
          </span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={totalMedia >= MAX_CHAPTER_MEDIA}
            className="press-scale rounded-md border border-border bg-white px-2 py-1 font-display text-[11px] font-bold text-primary transition-colors hover:bg-primary/5 disabled:opacity-40"
          >
            {t('addMedia')}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={MEDIA_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            setNewFiles((prev) =>
              [...prev, ...picked].slice(0, MAX_CHAPTER_MEDIA - kept.length),
            );
            e.target.value = '';
          }}
        />
        {(kept.length > 0 || newFiles.length > 0) && (
          <ul className="mt-2 space-y-1">
            {kept.map((m, i) => (
              <li
                key={`${m.url}-${i}`}
                className="flex items-center justify-between gap-2 text-xs text-foreground"
              >
                <span className="truncate">
                  {m.type === 'video' ? '🎬' : '🖼️'}{' '}
                  {m.url.split('/').pop()}
                </span>
                <button
                  type="button"
                  aria-label={t('removeMedia')}
                  onClick={() => setKept((prev) => prev.filter((_, j) => j !== i))}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  ✕
                </button>
              </li>
            ))}
            {newFiles.map((f, i) => (
              <li
                key={`new-${f.name}-${i}`}
                className="flex items-center justify-between gap-2 text-xs text-foreground"
              >
                <span className="truncate">
                  {f.type.startsWith('video') ? '🎬' : '🖼️'} {f.name}
                </span>
                <button
                  type="button"
                  aria-label={t('removeMedia')}
                  onClick={() =>
                    setNewFiles((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="press-scale rounded-md border border-border bg-white px-3 py-1.5 font-display text-xs font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="press-scale rounded-md bg-primary px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  );
}
