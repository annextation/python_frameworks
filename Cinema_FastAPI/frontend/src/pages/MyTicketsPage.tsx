import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Booking {
  id: string;
  movieTitle: string;
  sessionDate: string;
  sessionTime: string;
  sessionFormat: string;
  hallName: string;
  seats: string;
  totalPrice: number;
  customerName: string;
  customerEmail: string;
  purchaseDate: string;
}

function MyTicketsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch('/api/bookings');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const records: Booking[] = await response.json();
        setBookings(records);
      } catch (error) {
        console.error('Ошибка загрузки бронирований:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const parseSeats = (seatsStr: string) => {
    try {
      return JSON.parse(seatsStr);
    } catch {
      return [];
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот билет?')) return;
    
    try {
      const response = await fetch('/api/bookings/' + encodeURIComponent(bookingId), {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (error) {
      console.error('Ошибка при удалении:', error);
      alert('Не удалось удалить билет');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Навигация */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight">
            КИНО<span className="text-[var(--accent)]">.</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            На главную
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <div className="mb-10 animate-fade-up">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Мои билеты</h1>
          <p className="text-[var(--text-muted)]">
            {bookings.length} {bookings.length === 1 ? 'покупка' : bookings.length < 5 ? 'покупки' : 'покупок'}
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-20 animate-fade-up">
            <div className="text-6xl mb-4">🎟️</div>
            <p className="text-xl text-[var(--text-muted)] mb-6">
              У вас пока нет купленных билетов
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Выбрать фильм
              <span>→</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking, index) => {
              const seats = parseSeats(booking.seats);
              return (
                <div
                  key={booking.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 animate-fade-up relative group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Кнопка удаления */}
                  <button
                    onClick={() => handleDelete(booking.id)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    title="Удалить билет"
                  >
                    ✕
                  </button>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 pr-8">
                        {booking.movieTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                        <span>
                          📅{' '}
                          {new Date(booking.sessionDate).toLocaleDateString(
                            'ru-RU',
                            {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                            }
                          )}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
                        <span>🕐 {booking.sessionTime}</span>
                        <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
                        <span>{booking.sessionFormat}</span>
                      </div>
                      <div className="mt-3 text-sm">
                        <span className="text-[var(--text-muted)]">Места: </span>
                        <span className="font-medium">
                          {seats
                            .map((s: any) => `Ряд ${s.row}, Место ${s.seat}`)
                            .join(', ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-2">
                      <div className="text-2xl font-bold text-[var(--text)]">
                        {booking.totalPrice} ₽
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Куплено{' '}
                        {new Date(booking.purchaseDate).toLocaleDateString(
                          'ru-RU'
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm text-[var(--text-muted)]">
                    <div>
                      <span className="text-[var(--text-muted)]">Покупатель: </span>
                      <span className="text-[var(--text)]">{booking.customerName}</span>
                    </div>
                    <div>
                      <span>{booking.customerEmail}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Футер */}
      <footer className="border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-muted)]">КИНО. © 2026</p>
          <p className="text-xs text-[var(--text-muted)]">
            Учебный проект • React + FastAPI
          </p>
        </div>
      </footer>
    </div>
  );
}

export default MyTicketsPage;