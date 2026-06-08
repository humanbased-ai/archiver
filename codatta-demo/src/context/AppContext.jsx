import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [anchored, setAnchored] = useState(false);

  const connectWallet = (type) => {
    const shortAddr = {
      metamask: '0x3a4f...9c21',
      okx: '0x7b2e...4f83',
      walletconnect: '0x9d1a...8e52',
    };
    setWalletType(type);
    setWalletAddress(shortAddr[type] || '0x3a4f...9c21');
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setWalletType(null);
    setSubmission(null);
    setAnchored(false);
  };

  const submitData = (formData) => {
    const rand = Math.floor(10000 + Math.random() * 90000);
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const id = `SUB-${rand}-${letter}`;
    setSubmission({
      ...formData,
      id,
      submittedAt: new Date().toISOString(),
    });
    return id;
  };

  return (
    <AppContext.Provider value={{
      walletAddress,
      walletType,
      connectWallet,
      disconnectWallet,
      submission,
      submitData,
      anchored,
      setAnchored,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
