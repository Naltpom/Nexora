import { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import MultiSelect, { type MultiSelectOption } from '../MultiSelect'

const STRATEGIES = ['boolean', 'percentage', 'targeted', 'ab_test'] as const

export interface FlagFormData {
  feature_name: string
  strategy: string
  description: string
  rollout_percentage: number
  target_roles: string[]
  target_users: string
  variants: { name: string; weight: number }[]
  is_enabled: boolean
}

interface FeatureFlagFormProps {
  form: FlagFormData
  onChange: (updater: (prev: FlagFormData) => FlagFormData) => void
  onSubmit: (e: FormEvent) => void
  onCancel: () => void
  isEdit: boolean
  featureOptions: { value: string; label: string }[]
  roleOptions: MultiSelectOption[]
}

export default function FeatureFlagForm({
  form, onChange, onSubmit, onCancel, isEdit, featureOptions, roleOptions,
}: FeatureFlagFormProps) {
  const { t } = useTranslation('feature_flags')

  const variantSum = form.variants.reduce((sum, v) => sum + (v.weight || 0), 0)

  return (
    <form onSubmit={onSubmit}>
      <div className="modal-body">
        {!isEdit && (
          <div className="form-group">
            <label className="form-label">{t('field_feature')}</label>
            <select
              className="input"
              value={form.feature_name}
              onChange={e => onChange(f => ({ ...f, feature_name: e.target.value }))}
              required
            >
              <option value="">{t('field_feature_placeholder')}</option>
              {featureOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label} ({opt.value})</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{t('field_strategy')}</label>
          <div className="ff-strategy-radios">
            {STRATEGIES.map(s => (
              <label key={s} className="ff-strategy-radio">
                <input
                  type="radio"
                  name="strategy"
                  value={s}
                  checked={form.strategy === s}
                  onChange={() => onChange(f => ({ ...f, strategy: s }))}
                />
                <span className={`ff-strategy-badge ${s}`}>
                  {t(`strategy_${s}`)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t('field_description')}</label>
          <input
            type="text"
            className="input"
            value={form.description}
            onChange={e => onChange(f => ({ ...f, description: e.target.value }))}
            placeholder={t('field_description_placeholder')}
          />
        </div>

        {form.strategy === 'percentage' && (
          <div className="form-group">
            <label className="form-label">{t('field_rollout_percentage')}: {form.rollout_percentage}%</label>
            <input
              type="range"
              className="ff-range-input"
              min="0"
              max="100"
              value={form.rollout_percentage}
              onChange={e => onChange(f => ({ ...f, rollout_percentage: parseInt(e.target.value) }))}
            />
            <div className="ff-range-labels">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {form.strategy === 'targeted' && (
          <>
            <div className="form-group">
              <label className="form-label">{t('field_target_roles')}</label>
              <MultiSelect
                options={roleOptions}
                values={form.target_roles}
                onChange={values => onChange(f => ({ ...f, target_roles: values }))}
                placeholder={t('field_target_roles_placeholder')}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('field_target_users')}</label>
              <input
                type="text"
                className="input"
                value={form.target_users}
                onChange={e => onChange(f => ({ ...f, target_users: e.target.value }))}
                placeholder={t('field_target_users_placeholder')}
              />
            </div>
          </>
        )}

        {form.strategy === 'ab_test' && (
          <div className="form-group">
            <label className="form-label">{t('field_variants')}</label>
            <div className="ff-variants-list">
              {form.variants.map((v, i) => (
                <div key={i} className="ff-variant-row">
                  <input
                    type="text"
                    className="input ff-variant-name"
                    value={v.name}
                    onChange={e => {
                      const name = e.target.value
                      onChange(f => {
                        const variants = [...f.variants]
                        variants[i] = { ...variants[i], name }
                        return { ...f, variants }
                      })
                    }}
                    placeholder={t('field_variant_name')}
                    required
                  />
                  <input
                    type="number"
                    className="input ff-variant-weight"
                    value={v.weight}
                    onChange={e => {
                      const weight = parseInt(e.target.value) || 0
                      onChange(f => {
                        const variants = [...f.variants]
                        variants[i] = { ...variants[i], weight }
                        return { ...f, variants }
                      })
                    }}
                    placeholder={t('field_variant_weight')}
                    min="0"
                    max="100"
                    required
                  />
                  {form.variants.length > 2 && (
                    <button
                      type="button"
                      className="btn-icon btn-icon-danger"
                      onClick={() => onChange(f => ({
                        ...f,
                        variants: f.variants.filter((_, idx) => idx !== i),
                      }))}
                      title={t('btn_remove_variant')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="ff-add-variant-btn"
              onClick={() => onChange(f => ({
                ...f,
                variants: [...f.variants, { name: '', weight: 0 }],
              }))}
            >
              + {t('btn_add_variant')}
            </button>
            {variantSum !== 100 && (
              <div className="ff-variant-warning">
                {t('variant_weight_sum', { sum: variantSum })}
              </div>
            )}
          </div>
        )}

        <label className="ff-checkbox-toggle">
          <input
            type="checkbox"
            checked={form.is_enabled}
            onChange={e => onChange(f => ({ ...f, is_enabled: e.target.checked }))}
          />
          <span className="ff-checkbox-label">{t('field_enabled')}</span>
        </label>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {t('btn_cancel')}
        </button>
        <button type="submit" className="btn btn-primary">
          {t('btn_save')}
        </button>
      </div>
    </form>
  )
}
