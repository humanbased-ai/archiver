import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import ValidatorToolPage from './ValidatorToolPage';
import ExamplesPage from './ExamplesPage';

const App: React.FC = () => {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md transition-colors duration-150 ease-in-out font-medium 
     ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`;

  return (
    <Router>
      <div className="bg-gray-900 min-h-screen flex flex-col">
        <nav className="p-4 bg-gray-800 text-white shadow-md sticky top-0 z-50">
          <ul className="flex space-x-6 justify-center items-center">
            <li>
              <NavLink to="/" className={navLinkClass}>
                Validator Tool
              </NavLink>
            </li>
            <li>
              <NavLink to="/examples" className={navLinkClass}>
                Examples
              </NavLink>
            </li>
          </ul>
        </nav>
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<ValidatorToolPage />} />
            <Route path="/examples" element={<ExamplesPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
