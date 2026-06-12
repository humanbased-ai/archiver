import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import AppRouter from './router.tsx';
import './index.css';

const themeConfig = {
  // algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#875DFF',
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={themeConfig}>
      <AppRouter />
    </ConfigProvider>
  </StrictMode>
);
