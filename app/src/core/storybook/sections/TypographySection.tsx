import { useTranslation } from 'react-i18next'

export default function TypographySection() {
  const { t } = useTranslation('storybook')

  return (
    <div className="storybook-section">
      <h2>{t('typography_title')}</h2>

      <h3>{t('typography_headings_title')}</h3>
      <div className="storybook-preview">
        <h1>{t('typography_h1_demo')}</h1>
        <h2>{t('typography_h2_demo')}</h2>
        <h3>{t('typography_h3_demo')}</h3>
        <h4>{t('typography_h4_demo')}</h4>
        <h5>{t('typography_h5_demo')}</h5>
        <h6>{t('typography_h6_demo')}</h6>
      </div>

      <h3>{t('typography_body_title')}</h3>
      <div className="storybook-preview">
        <p>
          {t('typography_body_text')}
        </p>
      </div>

      <h3>{t('typography_weights_title')}</h3>
      <div className="storybook-preview">
        <p className="storybook-font-weight-400">
          {t('typography_weight_400')}
        </p>
        <p className="storybook-font-weight-500">
          {t('typography_weight_500')}
        </p>
        <p className="storybook-font-weight-600">
          {t('typography_weight_600')}
        </p>
        <p className="storybook-font-weight-700">
          {t('typography_weight_700')}
        </p>
      </div>

      <h3>{t('typography_colors_title')}</h3>
      <table className="storybook-color-table">
        <thead>
          <tr>
            <th>{t('typography_color_th_variable')}</th>
            <th>{t('typography_color_th_value')}</th>
            <th>{t('typography_color_th_usage')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>--primary</code></td>
            <td><code>#1E40AF</code></td>
            <td>{t('typography_color_primary_usage')}</td>
          </tr>
          <tr>
            <td><code>--primary-light</code></td>
            <td><code>#3B82F6</code></td>
            <td>{t('typography_color_primary_light_usage')}</td>
          </tr>
          <tr>
            <td><code>--primary-dark</code></td>
            <td><code>#1E3A8A</code></td>
            <td>{t('typography_color_primary_dark_usage')}</td>
          </tr>
          <tr>
            <td><code>--success</code></td>
            <td><code>#059669</code></td>
            <td>{t('typography_color_success_usage')}</td>
          </tr>
          <tr>
            <td><code>--warning</code></td>
            <td><code>#D97706</code></td>
            <td>{t('typography_color_warning_usage')}</td>
          </tr>
          <tr>
            <td><code>--danger</code></td>
            <td><code>#DC2626</code></td>
            <td>{t('typography_color_danger_usage')}</td>
          </tr>
          <tr>
            <td><code>--gray-50</code></td>
            <td><code>#F9FAFB</code></td>
            <td>{t('typography_color_gray50_usage')}</td>
          </tr>
          <tr>
            <td><code>--gray-100</code></td>
            <td><code>#F3F4F6</code></td>
            <td>{t('typography_color_gray100_usage')}</td>
          </tr>
          <tr>
            <td><code>--gray-200</code></td>
            <td><code>#E5E7EB</code></td>
            <td>{t('typography_color_gray200_usage')}</td>
          </tr>
          <tr>
            <td><code>--gray-300</code></td>
            <td><code>#D1D5DB</code></td>
            <td>{t('typography_color_gray300_usage')}</td>
          </tr>
          <tr>
            <td><code>--gray-400</code></td>
            <td><code>#9CA3AF</code></td>
            <td>{t('typography_color_gray400_usage')}</td>
          </tr>
          <tr>
            <td><code>--gray-500</code></td>
            <td><code>#6B7280</code></td>
            <td>{t('typography_color_gray500_usage')}</td>
          </tr>
          <tr>
            <td><code>--gray-600</code></td>
            <td><code>#4B5563</code></td>
            <td>{t('typography_color_gray600_usage')}</td>
          </tr>
          <tr>
            <td><code>--gray-700</code></td>
            <td><code>#374151</code></td>
            <td>{t('typography_color_gray700_usage')}</td>
          </tr>
          <tr>
            <td><code>--gray-800</code></td>
            <td><code>#1F2937</code></td>
            <td>{t('typography_color_gray800_usage')}</td>
          </tr>
          <tr>
            <td><code>--gray-900</code></td>
            <td><code>#111827</code></td>
            <td>{t('typography_color_gray900_usage')}</td>
          </tr>
        </tbody>
      </table>

      <h3>{t('typography_colors_demo_title')}</h3>
      <div className="storybook-row">
        <button className="btn btn-primary" type="button">
          --primary
        </button>
        <button className="btn btn-success" type="button">
          --success
        </button>
        <button className="btn btn-warning" type="button">
          --warning
        </button>
        <button className="btn btn-danger" type="button">
          --danger
        </button>
      </div>
      <div className="storybook-row">
        <div className="alert alert-success">
          {t('typography_alert_success')} <code>--success</code>
        </div>
      </div>
      <div className="storybook-row">
        <div className="alert alert-error">
          {t('typography_alert_error')} <code>--danger</code>
        </div>
      </div>
    </div>
  )
}
