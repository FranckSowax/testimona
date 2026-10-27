import { useTranslations } from 'next-intl';
import {
  LONG_TEXT_MAX,
  SHORT_TEXT_MAX,
  type ListField,
  type ListItem,
  type ListQuestion,
} from '../../types';
import { FIELD_CLASS, type FieldProps } from '../field';
import { emptyItem } from '../values';

interface ItemFieldProps {
  id: string;
  field: ListField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
  readOnly: boolean;
}

/** Un champ d'un élément ; libellés : `journey.fields.<nom>` et `journey.fields.options.<nom>.<option>`. */
function ItemField({ id, field, value, onChange, readOnly }: ItemFieldProps) {
  const t = useTranslations('journey');
  const label = t(`fields.${field.name}`);
  if (field.kind === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          disabled={readOnly}
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
        >
          <option value="">{t('ui.chooseOption')}</option>
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
          maxLength={LONG_TEXT_MAX}
          className={FIELD_CLASS}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          maxLength={SHORT_TEXT_MAX}
          autoComplete="off"
          className={FIELD_CLASS}
        />
      )}
    </label>
  );
}

export function ListInput({
  question,
  ...props
}: FieldProps<ListItem[]> & { question: ListQuestion }) {
  const t = useTranslations('journey.ui');
  const items = props.value;
  const update = (index: number, name: string, value: string | boolean) =>
    props.onChange(items.map((item, i) => (i === index ? { ...item, [name]: value } : item)));

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
          {question.fields.map((field, f) => (
            <ItemField
              key={field.name}
              id={index === 0 && f === 0 ? props.id : `${props.id}-${index}-${field.name}`}
              field={field}
              value={item[field.name]}
              onChange={(value) => update(index, field.name, value)}
              readOnly={props.readOnly}
            />
          ))}
          {!props.readOnly && items.length > 1 && (
            <button
              type="button"
              onClick={() => props.onChange(items.filter((_, i) => i !== index))}
              className="text-sm text-white/70 underline"
            >
              {t('removeItem')}
            </button>
          )}
        </fieldset>
      ))}
      {!props.readOnly && items.length < question.maxItems && (
        <button
          type="button"
          onClick={() => props.onChange([...items, emptyItem(question)])}
          className="rounded-full border border-white/40 px-4 py-2 text-sm"
        >
          {t('addItem')}
        </button>
      )}
    </div>
  );
}
