import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import VideoRoom from "./pages/VideoRoom"

function App() {
  return (
    <Router>
      <Routes>
        {/* <Route element={<MainLayout />}> */}
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element = {<Lobby/>}/>
          <Route path="/meeting/:id" element={<VideoRoom />} />
        {/* </Route> */}
      </Routes>
    </Router>
  );
}

export default App;
