import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import GalleryPage from './pages/GalleryPage';
import StatsPage from './pages/StatsPage';
import ImportPage from './pages/ImportPage';
import Data18Page from './pages/Data18Page';
import { Data18MoviePage, Data18ScenePage } from './pages/Data18DetailPage';
import PlayerPage from './pages/PlayerPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Dedicated standalone fullscreen player (0 site chrome, completely separate window) */}
        <Route path="/player" element={<PlayerPage />} />

        {/* Main application shell */}
        <Route path="/" element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="play" element={<GamePage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="data18" element={<Data18Page />} />
          <Route path="data18/scene/:id" element={<Data18ScenePage />} />
          <Route path="data18/movie/:slug" element={<Data18MoviePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
