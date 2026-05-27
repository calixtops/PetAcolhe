import { useEffect, useState } from 'react';

const STORAGE_KEY = 'petacolhe:onboarding:v1';

const STEPS = [
  {
    emoji: '🐾',
    title: 'Bem-vindo ao PetAcolhe!',
    body: 'A rede solidária que conecta colônias de animais de rua, adoções, desaparecidos e clínicas parceiras na sua cidade.',
  },
  {
    emoji: '📍',
    title: 'Encontre pontos no mapa',
    body: 'Os pinos rosa mostram colônias precisando de ajuda. Toque em qualquer marcador para ver detalhes, fotos e o fórum da colônia.',
  },
  {
    emoji: '➕',
    title: 'Cadastre algo novo',
    body: 'Toque em qualquer lugar do mapa para registrar uma nova colônia, alerta de pet desaparecido ou clínica parceira.',
  },
  {
    emoji: '⚙️',
    title: 'Filtros e localização',
    body: 'Use os botões à direita: ⚙️ para filtrar o que aparece no mapa e 📍 para centralizar na sua localização atual.',
  },
];

export function OnboardingModal(): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  if (!open) return null;

  const close = (): void => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const next = (): void => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  };

  const skip = (): void => close();

  const current = STEPS[step] ?? STEPS[0]!;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="pa-overlay" onClick={skip}>
      <div className="pa-modal pa-onboarding" onClick={(e) => e.stopPropagation()}>
        <button className="pa-onboarding-skip" onClick={skip} aria-label="Pular">×</button>

        <div className="pa-onboarding-emoji">{current.emoji}</div>
        <h2 className="pa-onboarding-title">{current.title}</h2>
        <p className="pa-onboarding-body">{current.body}</p>

        <div className="pa-onboarding-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`pa-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>

        <div className="pa-onboarding-actions">
          {!isLast && (
            <button className="pa-btn ghost" onClick={skip}>Pular</button>
          )}
          <button className="pa-btn block" onClick={next}>
            {isLast ? 'Começar a explorar 🐾' : 'Próximo →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HelpButton(): JSX.Element {
  return (
    <button
      className="pa-help-btn"
      aria-label="Ajuda"
      title="Como usar o PetAcolhe"
      onClick={() => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }}
    >
      ?
    </button>
  );
}
