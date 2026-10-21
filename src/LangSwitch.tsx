import { LANGS, t, useLang } from './i18n'

export function LangSwitch({ wide }: { wide?: boolean }) {
  const { lang, setLang } = useLang()
  return (
    <div className={'lang' + (wide ? ' seg' : '')} role="group" aria-label={t('Idioma')}>
      {LANGS.map(([l, label]) => (
        <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)} aria-pressed={lang === l}>
          {label}
        </button>
      ))}
    </div>
  )
}
