import { MoonIcon, SunIcon } from "./icons";

interface Props {
  night: boolean;
  onToggleTheme(): void;
}

export function Header({ night, onToggleTheme }: Props) {
  return (
    <>
      <header>
        <div>
          <h1>Стройка целей</h1>
          <p className="sub">
            Каждая выполненная задача кладёт новые кирпичи. Большая цель — дом, средняя — коттедж, ежедневная — хижина, которую строишь заново каждый день.
          </p>
        </div>
        <div className="head-r">
          <span className="sync">сохранение в браузере</span>
          <button
            className="theme-btn"
            type="button"
            onClick={onToggleTheme}
            aria-label={night ? "Сейчас ночь. Переключить на день" : "Сейчас день. Переключить на ночь"}
          >
            <span className="ic">{night ? <MoonIcon /> : <SunIcon />}</span>
            <span>{night ? "Ночь" : "День"}</span>
          </button>
        </div>
      </header>
      <div className="tape" aria-hidden="true" />
    </>
  );
}
