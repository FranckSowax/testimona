export const FIELD_CLASS =
  'w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 aria-[invalid=true]:border-accent-soft read-only:opacity-80';

/** Props communes des champs : le titre de la question sert de nom accessible. */
export interface FieldProps<T> {
  id: string;
  value: T;
  onChange: (value: T) => void;
  readOnly: boolean;
  invalid: boolean;
  labelledBy: string;
  describedBy: string | undefined;
}
