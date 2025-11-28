import React, { useState } from 'react';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { ExpenseSplitter } from './components/ExpenseSplitter';
import { FriendsList } from './components/FriendsList';
import { OCRScanner } from './components/OCRScanner';
import { ChatBot } from './components/ChatBot';
import { ProfilePage } from './components/ProfilePage';
import { PaymentReminders } from './components/PaymentReminders';
import { BadgesLeaderboard } from './components/BadgesLeaderboard';
import { BudgetTracker } from './components/BudgetTracker';
import { Toaster } from './components/ui/toaster';

type Page = 'auth' | 'dashboard' | 'splitter' | 'friends' | 'scanner' | 'chatbot' | 'profile' | 'reminders' | 'badges' | 'budget';

export interface ExtractedData {
  merchantName: string;
  date: string;
  total: number;
  items: { name: string; price: number }[];
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('auth');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const handleAuth = () => {
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('auth');
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  const navigateBack = () => {
    setCurrentPage('dashboard');
  };

  const handleOcrScan = (data: ExtractedData) => {
    setExtractedData(data);
    setCurrentPage('splitter');
  };

  const renderPage = () => {
    if (!isAuthenticated) {
      return <AuthPage onAuth={handleAuth} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigateTo} />;
      case 'splitter':
        return <ExpenseSplitter onBack={navigateBack} initialData={extractedData} setInitialData={setExtractedData} />;
      case 'friends':
        return <FriendsList onBack={navigateBack} />;
      case 'scanner':
        return <OCRScanner onBack={navigateBack} onScan={handleOcrScan} />;
      case 'chatbot':
        return <ChatBot onBack={navigateBack} />;
      case 'profile':
        return <ProfilePage onBack={navigateBack} onLogout={handleLogout} />;
      case 'reminders':
        return <PaymentReminders onBack={navigateBack} />;
      case 'badges':
        return <BadgesLeaderboard onBack={navigateBack} />;
      case 'budget':
        return <BudgetTracker onBack={navigateBack} />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <>
      {renderPage()}
      <Toaster />
    </>
  );
}
