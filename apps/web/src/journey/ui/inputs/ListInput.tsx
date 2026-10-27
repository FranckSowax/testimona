import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  LONG_TEXT_MAX,
  SHORT_TEXT_MAX,
  type ListField,
  type ListItem,
  type ListQuestion,
} from '../../types';
import { FIELD_CLASS, type FieldProps } from '../field';
import { emptyItem, listFieldId } from '../values';

interface ItemFieldProps {
  id: string;
  field: ListField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
  readOnly: boolean;
  invalid: boolean;
}

/** Un champ d'un élément ; libellés : `journey.fields.<nom>` et `journey.fields.options.<nom>.<option>`. */
function ItemField({ id, field, value, onChange, readOnly, invalid }: ItemFieldProps) {
  const t = useTranslations('journey');
  const label = t(`fields.${field.name}`);
  const a11y = {
    'aria-invalid': invalid,
    'aria-describedby': invalid ? 'question-error' : undefined,
  };
  if (field.kind === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          disabled={readOnly}
          className="disabled:opacity-80"
          {...a11y}
        />
        {label}
      </label>
    );
  }
  const text = typeof value === 'string' ? value : '';
  return (
    <label className="block space-y-1">
      <span className="text-sm">{label}</span>
      {field.kind === 'choice' ? (
        <select
          id={id}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={FIELD_CLASS}
          {...a11y}
        >
          <option value="" className="text-foreground">
            {t('ui.chooseOption')}
          </option>
          {field.options.map((option) => (
            <option key={option} value={option} className="text-foreground">
              {t(`fields.options.${field.name}.${option}`)}
            </option>
          ))}
        </select>
      ) : field.kind === 'longText' ? (
        <textarea
          id={id}
          rows={3}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          data-readonly={readOnly}
          maxLength={LONG_TEXT_MAX}
          className={FIELD_CLASS}
          {...a11y}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          data-readonly={readOnly}
          maxLength={SHORT_TEXT_MAX}
          autoComplete="off"
          className={FIELD_CLASS}
          {...a11y}
        />
      )}
    </label>
  );
}

export function ListInput({
  question,
  invalidIds,
  ...props
}: FieldProps<ListItem[]> & { question: ListQuestion; invalidIds: readonly string[] }) {
  const t = useTranslations('journey.ui');
  const items = props.value;
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const addId = `${props.id}-add`;
  const firstName = question.fields[0]?.name ?? '';
  const fieldIdAt = (index: number, name: string) => listFieldId(props.id, question, index, name);
  const update = (index: number, name: string, value: string | boolean) =>
    props.onChange(items.map((item, i) => (i === index ? { ...item, [name]: value } : item)));

  // WHY: l'élément ajouté ou retiré change la liste ; le focus est replacé une fois le rendu fait.
  useEffect(() => {
    if (focusTarget === null) return;
    document.getElementById(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  const remove = (index: number) => {
    props.onChange(items.filter((_, i) => i !== index));
    // Après retrait, l'élément précédent garde son rang ; à défaut, le suivant prend le rang 0.
    setFocusTarget(items.length > 1 ? fieldIdAt(Math.max(index - 1, 0), firstName) : addId);
  };

  return (
    <div
      className="space-y-4"
      role="group"
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
    >
      {items.map((item, index) => (
        // WHY: les éléments n'ont pas d'identifiant ; les champs sont contrôlés, l'index suffit.
        <fieldset key={index} className="space-y-3 rounded-2xl border border-white/20 p-4">
          <legend className="px-1 text-sm text-white/70">{t('item', { n: index + 1 })}</legend>
          {question.fields.map((field) => {
            const id = fieldIdAt(index, field.name);
            return (
              <ItemField
                key={field.name}
                id={id}
                field={field}
                value={item[field.name]}
                onChange={(value) => update(index, field.name, value)}
                readOnly={props.readOnly}
                invalid={invalidIds.includes(id)}
              />
            );
          })}
          {!props.readOnly && items.length > 1 && (
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={t('removeItemN', { n: index + 1 })}
              className="text-sm text-white/70 underline"
            >
              {t('removeItem')}
            </button>
          )}
        </fieldset>
      ))}
      {!props.readOnly && items.length < question.maxItems && (
        <button
          id={addId}
          type="button"
          onClick={() => {
            props.onChange([...items, emptyItem(question)]);
            setFocusTarget(fieldIdAt(items.length, firstName));
          }}
          className="rounded-full border border-white/40 px-4 py-2 text-sm"
        >
          {t('addItem')}
        </button>
      )}
    </div>
  );
}
