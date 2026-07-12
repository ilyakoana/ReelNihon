import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import ContentsPage from './pages/ContentsPage';
import ContentDetailPage from './pages/ContentDetailPage';
import DailiesPage from './pages/DailiesPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ContentsPage />} />
        <Route path="/content/:id" element={<ContentDetailPage />} />
        <Route path="/dailies" element={<DailiesPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}
