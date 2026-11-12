import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import MoviePage from './pages/MoviePage';
import BookingPage from './pages/BookingPage';
import CheckoutPage from './pages/CheckoutPage';
import MyTicketsPage from './pages/MyTicketsPage'; // <-- Добавь это

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/movie/:id" element={<MoviePage />} />
        <Route path="/booking/:movieId/:sessionId" element={<BookingPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/my-tickets" element={<MyTicketsPage />} /> {/* <-- Добавь это */}
      </Routes>
    </Router>
  );
}

export default App;
