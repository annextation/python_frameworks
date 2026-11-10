import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import type { Seat } from '../types';

interface Movie {
  id: string;
  title: string;
  poster: string;
}

interface Session {
  id: string;
  movieId: string;
  date: string;
  time: string;
  format: string;
  hallId: string;
  price: number;
}

interface Hall {
  id: string;
  name: string;
  cinemaId: string;
  rows: number;
  seatsPerRow: number;
  vipRows: number[];
}

interface Cinema {
  id: string;
  name: string;
  address: string;
  metro: string;
}

function BookingPage() {
  const { movieId, sessionId } = useParams<{ movieId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [hall, setHall] = useState<Hall | null>(null);
  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [seats, setSeats] = useState<Seat[][]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!movieId || !sessionId) return;
      setIsLoading(true);
      setMovie(null);
      setSelectedSeats([]);

      try {
        const response = await fetch(
          `/api/movies/${encodeURIComponent(movieId)}/sessions/${encodeURIComponent(sessionId)}`,
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: { movie: Movie; session: Session; hall: Hall; cinema: Cinema } =
          await response.json();
        const { movie: movieData, session: sessionData, hall: hallData } = data;

        const occupiedResponse = await fetch(
          '/api/sessions/' + encodeURIComponent(sessionData.id) + '/occupied-seats',
        );
        if (!occupiedResponse.ok) throw new Error('Не удалось загрузить занятые места');

        const occupiedSeats: { row: number; seat: number }[] = await occupiedResponse.json();
        const occupied = new Set(occupiedSeats.map(({ row, seat }) => row + '-' + seat));

        // Генерируем схему
        const rows = Number(hallData.rows) || 8;
        const seatsPerRow = Number(hallData.seatsPerRow) || 12;
        const generatedSeats: Seat[][] = [];

        for (let row = 1; row <= rows; row++) {
          const rowSeats: Seat[] = [];
          for (let seat = 1; seat <= seatsPerRow; seat++) {
            const isVip = hallData.vipRows?.includes(row) || false;
            const isOccupied = occupied.has(`${row}-${seat}`);

            rowSeats.push({
              row,
              seat,
              isOccupied,
              isVip,
              price: isVip ? sessionData.price + 200 : sessionData.price,
            });
          }
          generatedSeats.push(rowSeats);
        }
        setMovie(movieData);
        setSession(sessionData);
        setHall(hallData);
        setCinema(data.cinema);
        setSeats(generatedSeats);
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [movieId, sessionId]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.isOccupied) return;
    setSelectedSeats((prev) => {
      const isSelected = prev.some((s) => s.row === seat.row && s.seat === seat.seat);
      if (isSelected) {
        return prev.filter((s) => !(s.row === seat.row && s.seat === seat.seat));
      }
      return [...prev, seat];
    });
  };

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  const handleCheckout = () => {
    if (!movie || !session || !hall || selectedSeats.length === 0) return;
    addItem({ movie, session, seats: selectedSeats, totalPrice });
    navigate('/checkout');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!movie || !session || !hall) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Данные не найдены</p>
          <Link to="/" className="text-[var(--accent)] hover:underline">
            ← На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Навигация */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to={`/movie/${movieId}`}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-2"
          >
            ← Назад к фильму
          </Link>
          <Link
            to="/my-tickets"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Мои билеты
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-24 py-8">
        {/* Заголовок сеанса */}
        <div className="mb-10 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            {movie.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-[var(--text-muted)]">
            <span>
              {new Date(session.date).toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
            <span className="text-[var(--text)] font-medium">{session.time}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
            <span>{session.format}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
            <span>{hall.name}</span>
          </div>
          {cinema && (
            <p className="mt-2 text-sm text-[var(--text-muted)] flex items-center gap-2">
              📍 {cinema.address} (м. {cinema.metro})
            </p>
          )}
        </div>

        {/* Легенда */}
        <div className="flex flex-wrap gap-6 mb-10 justify-center md:justify-start animate-fade-up">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--surface)] border-2 border-[var(--border)]"></div>
            <span className="text-sm text-[var(--text-muted)]">Свободно</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--accent)] border-2 border-[var(--accent)]"></div>
            <span className="text-sm text-[var(--text-muted)]">Выбрано</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--surface)] border-2 border-red-500/60"></div>
            <span className="text-sm text-[var(--text-muted)]">Занято</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--surface)] border-2 border-yellow-500/60"></div>
            <span className="text-sm text-[var(--text-muted)]">VIP</span>
          </div>
        </div>

        {/* Схема зала */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 md:p-10 mb-8 overflow-x-auto animate-fade-up">
          <div className="text-center mb-10">
            <div className="inline-block w-2/3 h-2 bg-gradient-to-b from-[var(--text-muted)] to-transparent rounded-full opacity-30"></div>
            <p className="text-xs text-[var(--text-muted)] mt-3 uppercase tracking-widest">
              Экран
            </p>
          </div>

          <div className="space-y-3 min-w-[500px]">
            {seats.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)] w-6 text-right font-mono">
                  {row[0]?.row}
                </span>
                <div className="flex gap-2 flex-1 justify-center">
                  {row.map((seat) => {
                    const isSelected = selectedSeats.some(
                      (s) => s.row === seat.row && s.seat === seat.seat
                    );

                    let baseClasses =
                      'w-7 h-7 md:w-8 md:h-8 rounded text-[10px] md:text-xs font-medium flex items-center justify-center transition-all duration-200';
                    let stateClasses = '';

                    if (seat.isOccupied) {
                      stateClasses =
                        'bg-[var(--surface)] border-2 border-red-500/60 text-[var(--text-muted)]/40 cursor-not-allowed';
                    } else if (isSelected) {
                      stateClasses =
                        'bg-[var(--accent)] border-2 border-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20 scale-110';
                    } else if (seat.isVip) {
                      stateClasses =
                        'bg-[var(--surface)] border-2 border-yellow-500/60 text-yellow-500/80 hover:border-yellow-500 hover:bg-yellow-500/10 cursor-pointer';
                    } else {
                      stateClasses =
                        'bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer';
                    }

                    return (
                      <button
                        key={`${seat.row}-${seat.seat}`}
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.isOccupied}
                        className={`${baseClasses} ${stateClasses}`}
                        title={
                          seat.isOccupied
                            ? `Ряд ${seat.row}, Место ${seat.seat} — занято`
                            : `Ряд ${seat.row}, Место ${seat.seat} • ${seat.price} ₽`
                        }
                      >
                        {seat.seat}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky панель итогов */}
      {selectedSeats.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] backdrop-blur-xl z-40 animate-fade-up">
          <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-[var(--text-muted)] mb-1">
                Выбрано {selectedSeats.length}{' '}
                {selectedSeats.length === 1
                  ? 'место'
                  : selectedSeats.length < 5
                  ? 'места'
                  : 'мест'}
              </p>
              <p className="text-2xl font-bold text-[var(--text)]">
                {totalPrice} ₽
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 truncate max-w-[250px] md:max-w-md">
                {selectedSeats
                  .map((s) => `Ряд ${s.row}, Место ${s.seat}`)
                  .join(', ')}
              </p>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full md:w-auto px-8 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-semibold transition-colors shadow-lg shadow-[var(--accent)]/20"
            >
              Оформить билеты
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingPage;
