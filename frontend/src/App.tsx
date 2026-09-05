import React from 'react';
import { useApp } from './context/AppContext.js';
import { Header } from './components/Header.js';
import { BottomNav } from './components/BottomNav.js';
import { HomePage } from './pages/Home/HomePage.js';
import { LibraryPage } from './pages/Library/LibraryPage.js';
import { CupPage } from './pages/Cup/CupPage.js';
import { ContestPage } from './pages/Contest/ContestPage.js';
import { MarketPage } from './pages/Market/MarketPage.js';
import { ProfilePage } from './pages/Profile/ProfilePage.js';
import { AdminDashboard } from './pages/Admin/AdminDashboard.js';
import { InAppReader } from './pages/Library/InAppReader.js';
import { PremiumModal } from './components/PremiumModal.js';
import { NotificationModal } from './components/NotificationModal.js';
import { ReferralModal } from './components/ReferralModal.js';
import { ChannelSubscriptionModal } from './components/ChannelSubscriptionModal.js';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    user,
    refreshUserData,
    showToast,
    activeTab,
    isReaderOpen,
    activeBook,
    setIsReaderOpen,
    isReferralModalOpen,
    setIsReferralModalOpen,
    toast,
  } = useApp();

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans max-w-md mx-auto relative border-x border-[#1C2536] shadow-2xl">
      {/* Toast Popup */}
      {toast.show && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm animate-bounce-short">
          <div
            className={`p-3.5 rounded-2xl border shadow-xl flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-300 text-amber-900'
                : toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-300 text-rose-900'
                : 'bg-white/95 border-blue-200 text-slate-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : toast.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <span className="text-xs font-bold leading-tight">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header />

      {/* Main Tab Views */}
      <main className="flex-1">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'library' && <LibraryPage />}
        {activeTab === 'cup' && <CupPage />}
        {activeTab === 'contest' && <ContestPage />}
        {activeTab === 'market' && <MarketPage />}
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      {/* In-App Interactive Reader Overlay */}
      {isReaderOpen && activeBook && (
        <InAppReader book={activeBook} onClose={() => setIsReaderOpen(false)} />
      )}

      {/* Global Modals */}
      <PremiumModal />
      <NotificationModal />
      {isReferralModalOpen && <ReferralModal onClose={() => setIsReferralModalOpen(false)} />}

      {/* Strict Unclosable Channel Subscription Modal if user is not subscribed */}
      {user && user.isChannelSubscribed === false && !user.isAdmin && (
        <ChannelSubscriptionModal
          missingChannels={user.missingChannels || []}
          onSubscribed={refreshUserData}
          showToast={showToast}
        />
      )}

      {/* Bottom 6-Tab Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default AppContent;
