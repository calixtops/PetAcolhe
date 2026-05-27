import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';
import { MapPage } from './pages/MapPage.js';
import { AdoptionsPage } from './pages/AdoptionsPage.js';
import { MissingPage } from './pages/MissingPage.js';
import { HelpButton, OnboardingModal } from './components/OnboardingModal.js';

const navLinks = [
  { to: '/',              icon: '🗺️', label: 'Mapa',          end: true  },
  { to: '/adocoes',       icon: '🏠', label: 'Adoção',         end: false },
  { to: '/desaparecidos', icon: '🔔', label: 'Desaparecidos',  end: false },
];

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <div className="pa-app">
        <header className="pa-header">
          <div className="pa-brand">
            <span className="pa-logo-emoji">🐾</span>
            <div className="pa-brand-text">
              <strong>PetAcolhe</strong>
              <span className="pa-tagline">Conectando colônias, adoção e cuidado animal</span>
            </div>
          </div>
          <nav>
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({ isActive }) => (isActive ? 'active' : '')}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <HelpButton />
        </header>
        <main className="pa-main">
          <Routes>
            <Route path="/"              element={<MapPage />} />
            <Route path="/adocoes"       element={<AdoptionsPage />} />
            <Route path="/desaparecidos" element={<MissingPage />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <nav className="pa-bottom-nav">
          <div className="pa-bottom-nav-inner">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="ico">{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
        <OnboardingModal />
      </div>
    </BrowserRouter>
  );
}
