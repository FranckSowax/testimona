import { useTranslations } from 'next-intl';
import { CITY_MAX, type PlaceValue } from '../../types';
import { FIELD_CLASS, type FieldProps } from '../field';

export interface Country {
  code: string;
  label: string;
}

export function PlaceInput({
  countries,
  ...props
}: FieldProps<PlaceValue> & { countries: Country[] }) {
  const t = useTranslations('journey.fields');
  return (
    <div className="space-y-3" role="group" aria-labelledby={props.labelledBy}>
      <label className="block space-y-1">
        <span className="text-sm">{t('city')}</span>
        <input
          id={props.id}
          type="text"
          value={props.value.city}
          onChange={(e) => props.onChange({ ...props.value, city: e.target.value })}
          readOnly={props.readOnly}
          data-readonly={props.readOnly}
          maxLength={CITY_MAX}
          autoComplete="off"
          aria-invalid={props.invalid}
          aria-describedby={props.describedBy}
          className={FIELD_CLASS}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">{t('country')}</span>
        <select
          value={props.value.countryCode}
          onChange={(e) => props.onChange({ ...props.value, countryCode: e.target.value })}
          disabled={props.readOnly}
          className={FIELD_CLASS}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code} className="text-foreground">
              {c.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
