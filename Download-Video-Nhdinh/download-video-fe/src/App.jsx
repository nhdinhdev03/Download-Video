import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home/Home";

import FacebookDownloader from "./components/FacebookDownloader/FacebookDownloader";
import InstagramDownloader from "./components/InstagramDownloader/InstagramDownloader";
import TiktokDownloader from "./components/TiktokDownloader/TiktokDownloader";
import TwitterDownloader from "./components/TwitterDownloader/TwitterDownloader";
import ThreadsDownloader from "./components/ThreadsDownloader/ThreadsDownloader";
import YoutubeDownloader from "./components/YoutubeDownloader/YoutubeDownloader";
import NotFound from "./pages/NotFound/NotFound";
import Guide from "./pages/Guide/Guide";


function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/download/facebook" element={<FacebookDownloader />} />
          <Route path="/download/instagram" element={<InstagramDownloader />} />
          <Route path="/download/tiktok" element={<TiktokDownloader />} />
          <Route path="/download/twitter" element={<TwitterDownloader />} />
          <Route path="/download/threads" element={<ThreadsDownloader />} />
          <Route path="/download/youtube" element={<YoutubeDownloader />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
