import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import DataLineage from './pages/DataLineage';
import Marketplace from './pages/Marketplace';
import Dashboard from './pages/Dashboard';
import Frontier from './pages/Frontier';
import TaskPage from './pages/TaskPage';
import { AppProvider } from './context/AppContext';

export default function App() {
  return (
    <AppProvider>
    <BrowserRouter>
      <div className="dark min-h-screen bg-background text-on-surface">
        <Navbar />
        <Routes>
          <Route path="/" element={<Frontier />} />
          <Route path="/profile" element={<Dashboard />} />
          <Route path="/lineage" element={<DataLineage />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/task" element={<TaskPage />} />
        </Routes>
      </div>
    </BrowserRouter>
    </AppProvider>
  );
}
