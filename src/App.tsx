import { useState, useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { initDatabase } from './database/db';
import { pinService } from './services/pinService';
import { PinScreen } from './screens/PinScreen';
import { MainScreen } from './screens/MainScreen';
import { EmployeeFormScreen } from './screens/EmployeeFormScreen';
import { EmployeeDetailScreen } from './screens/EmployeeDetailScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ArchivedScreen } from './screens/ArchivedScreen';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider, useLanguage } from './i18n';
import type { Employee, EmployeeWithBalance } from './types';

// Route Screen Wrappers
function MainRoute() {
  const navigate = useNavigate();

  return (
    <MainScreen
      onSelectEmployee={(emp: EmployeeWithBalance) =>
        navigate(`/employee/${emp.id}`)
      }
      onAddEmployee={() => navigate('/add')}
      onOpenSettings={() => navigate('/settings')}
    />
  );
}

function AddEmployeeRoute() {
  const navigate = useNavigate();
  return (
    <EmployeeFormScreen
      onBack={() => navigate('/')}
      onSaved={() => navigate('/')}
    />
  );
}

function EditEmployeeRoute() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  return (
    <EmployeeFormScreen
      employeeId={id}
      onBack={() => navigate(`/employee/${id}`)}
      onSaved={() => navigate(`/employee/${id}`)}
      onArchived={() => navigate('/')}
    />
  );
}

function EmployeeDetailRoute() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  if (!id) {
    navigate('/');
    return null;
  }

  return (
    <EmployeeDetailScreen
      employeeId={id}
      onBack={() => navigate('/')}
      onEditEmployee={(emp: Employee) => navigate(`/edit/${emp.id}`)}
    />
  );
}

function SettingsRoute() {
  const navigate = useNavigate();
  return (
    <SettingsScreen
      onBack={() => navigate('/')}
      onOpenArchived={() => navigate('/archived')}
      onDataRestored={() => navigate('/')}
    />
  );
}

function ArchivedRoute() {
  const navigate = useNavigate();
  return <ArchivedScreen onBack={() => navigate('/settings')} />;
}

// Inner App with Database and PIN Lock State
function AppContent() {
  const { t } = useLanguage();
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(true);

  // Initialize DB and PIN service on launch
  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        await initDatabase();
        await pinService.init();
        if (isMounted) {
          setIsDbReady(true);
        }
      } catch (err: any) {
        console.error('[App] Bootstrap error:', err);
        if (isMounted) {
          setDbError(err?.message || 'Database initialization failed');
        }
      }
    }

    bootstrap();

    // 2-minute inactivity auto-lock listener
    const cleanupAutoLock = pinService.setupAutoLockListener(() => {
      setIsLocked(true);
    });

    return () => {
      isMounted = false;
      cleanupAutoLock();
    };
  }, []);

  if (dbError) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
          ⚠️
        </div>
        <h1 className="text-xl font-bold mb-2">Initialization Error</h1>
        <p className="text-sm text-slate-400 max-w-sm mb-6">{dbError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl bg-emerald-600 font-bold text-white shadow-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 text-3xl font-black">
          ₹
        </div>
        <p className="text-sm font-bold text-slate-300 tracking-wider">
          {t('loading')}
        </p>
      </div>
    );
  }

  // Show PIN lock screen if locked
  if (isLocked) {
    return <PinScreen mode="VERIFY" onSuccess={() => setIsLocked(false)} />;
  }

  // App is unlocked: render HashRouter routes
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainRoute />} />
        <Route path="/add" element={<AddEmployeeRoute />} />
        <Route path="/edit/:id" element={<EditEmployeeRoute />} />
        <Route path="/employee/:id" element={<EmployeeDetailRoute />} />
        <Route path="/settings" element={<SettingsRoute />} />
        <Route path="/archived" element={<ArchivedRoute />} />
        <Route path="*" element={<MainRoute />} />
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </LanguageProvider>
  );
}
