import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from '@/components/Layout';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/ProtectedRoute';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PeriodDashboardPage } from '@/pages/PeriodDashboardPage';
import { AndamentoCasaPage } from '@/pages/AndamentoCasaPage';
import { AndamentoPersonalePage } from '@/pages/AndamentoPersonalePage';
import { CestinoPage } from '@/pages/CestinoPage';
import { PeriodsPage } from '@/pages/PeriodsPage';
import { PersonalBudgetPage } from '@/pages/PersonalBudgetPage';
import { PersonalDashboardPage } from '@/pages/PersonalDashboardPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SettingsPage } from '@/pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrazione" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          {/* Senza id le viste seguono il **mese selezionato** globale: cosi'
              le voci del menu hanno sempre una destinazione, anche da pagine
              che nell'URL non portano un mese (Andamento, Elenco, Cestino). */}
          <Route path="/mesi" element={<PeriodDashboardPage />} />
          {/* Rotte fisse: devono precedere "/mesi/:periodId". */}
          <Route path="/mesi/spese" element={<ExpensesPage />} />
          <Route path="/mesi/elenco" element={<PeriodsPage />} />
          <Route path="/mesi/andamento" element={<AndamentoCasaPage />} />
          {/* Link diretti a un mese: allineano anche il mese globale. */}
          <Route path="/mesi/:periodId" element={<PeriodDashboardPage />} />
          <Route path="/mesi/:periodId/spese" element={<ExpensesPage />} />

          <Route path="/budget" element={<PersonalDashboardPage />} />
          <Route path="/budget/elenco" element={<PersonalBudgetPage />} />
          <Route path="/budget/andamento" element={<AndamentoPersonalePage />} />
          <Route path="/budget/:personalPeriodId" element={<PersonalDashboardPage />} />
          <Route path="/impostazioni" element={<SettingsPage />} />
          <Route path="/cestino" element={<CestinoPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/mesi" replace />} />
    </Routes>
  );
}
