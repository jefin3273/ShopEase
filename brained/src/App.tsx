import { Routes, Route } from 'react-router-dom';
import HomePage from './components/pages/HomePage';
import LoginPage from './login/page';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

export default App;
