import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import GalleryPage from './pages/GalleryPage';
import StatsPage from './pages/StatsPage';
import ImportPage from './pages/ImportPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="play" element={<GamePage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="import" element={<ImportPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
