import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import GifLayout from './layouts/GifLayout';
import ResultLayout from './layouts/ResultLayout';
import GifPage from './pages/GifPage';
import ResultPage from './pages/ResultPage';
import HomePage from './pages/HomePage';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GifLayout />}>
          <Route index element={<HomePage />} />
          <Route path="gif/:formType" element={<GifPage />} />
          <Route path="result" element={<ResultPage />} />
        </Route>
        <Route path="/result" element={<ResultLayout />}>
          <Route index element={<ResultPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default AppRouter;
