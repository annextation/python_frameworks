import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

interface Movie {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  overview: string;
  rating: number;
  genres: string[];
  ageRating: string;
  duration: number;
  releaseDate: string;
  director: string;
  cast: string[];
}

interface Cinema {
  name: string;
  address: string;
  phone: string;
  metro: string;
  workingHours: string;
}

interface Session {
  id: string;
  date: string;
  time: string;
  format: string;
  price: number;
  cinema: Cinema;
}

interface MovieDetails {
  movie: Movie;
  sessions: Session[];
}

export default function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('Все');

  useEffect(() => {
    if (!id) {
      setError('Фильм не найден');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError('');
    setDetails(null);
    setSelectedDate('');
    setSelectedFormat('Все');

    async function loadMovie(movieId: string) {
      try {
        const response = await fetch('/api/movies/' + encodeURIComponent(movieId), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Фильм не найден' : 'Ошибка загрузки фильма');
        }

        const data: MovieDetails = await response.json();
        const now = Date.now();
        const sessions = data.sessions.filter(
          (session) => new Date(session.date + 'T' + session.time).getTime() > now,
        );
        if (!controller.signal.aborted) {
          setDetails({ movie: data.movie, sessions });
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Ошибка загрузки фильма');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadMovie(id);
    return () => controller.abort();
  }, [id]);

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center">Загрузка...</div>;
  }

  if (!details) {
    return (
      <div className="min-h-screen grid place-items-center text-center">
        <div>
          <p className="text-xl mb-4">{error || 'Фильм не найден'}</p>
          <Link to="/" className="text-[var(--accent)] hover:underline">← На главную</Link>
        </div>
      </div>
    );
  }

  const { movie, sessions } = details;
  const dates = Array.from(new Set(sessions.map((session) => session.date))).sort();
  const formats = ['Все', ...Array.from(new Set(sessions.map((session) => session.format))).sort()];
  const activeDate = selectedDate || dates[0];
  const visibleSessions = sessions.filter(
    (session) => session.date === activeDate &&
      (selectedFormat === 'Все' || session.format === selectedFormat),
  );
  const cinema = visibleSessions[0]?.cinema ?? sessions[0]?.cinema;
  const filterClass = (active: boolean) =>
    'px-5 py-2 rounded-lg text-sm font-medium transition-colors ' +
    (active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]');

  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold">КИНО<span className="text-[var(--accent)]">.</span></Link>
          <Link to="/my-tickets" className="text-sm text-[var(--text-muted)]">Мои билеты</Link>
        </div>
      </nav>

      <section className="relative h-[70vh] overflow-hidden">
        <img src={movie.backdrop || movie.poster} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/70 to-transparent" />
        <div className="relative h-full max-w-7xl mx-auto px-6 flex items-end pb-12">
          <div className="animate-fade-up">
            <Link to="/" className="inline-block text-sm text-[var(--text-muted)] mb-6">← Назад</Link>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span><span className="text-yellow-400">★</span> {movie.rating}</span>
              <span>{movie.ageRating}</span>
              <span>{movie.duration} мин</span>
              <span>{movie.releaseDate.slice(0, 4)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        <img src={movie.poster} alt={movie.title} className="w-full rounded-lg shadow-2xl" />
        <div className="md:col-span-2 space-y-10">
          <div>
            <h2 className="text-2xl font-bold mb-4">Описание</h2>
            <p className="text-lg text-[var(--text-muted)]">{movie.overview}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Жанры</h2>
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((genre) => (
                <span key={genre} className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-full text-sm">{genre}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div><h3 className="text-sm text-[var(--text-muted)] mb-2">Режиссёр</h3><p>{movie.director}</p></div>
            <div><h3 className="text-sm text-[var(--text-muted)] mb-2">В ролях</h3><p>{movie.cast.join(', ')}</p></div>
          </div>

          {cinema && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">{cinema.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <span>📍 {cinema.address}</span>
                <span>🚇 м. {cinema.metro}</span>
                <span>📞 {cinema.phone}</span>
                <span>🕐 {cinema.workingHours}</span>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold mb-6">Расписание сеансов</h2>
            {sessions.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-12">Нет доступных сеансов</p>
            ) : (
              <>
                <h3 className="text-sm text-[var(--text-muted)] mb-3">Дата</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {dates.map((date) => (
                    <button type="button" key={date} onClick={() => setSelectedDate(date)} className={filterClass(date === activeDate)}>
                      {new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })}
                    </button>
                  ))}
                </div>
                <h3 className="text-sm text-[var(--text-muted)] mb-3">Формат</h3>
                <div className="flex flex-wrap gap-2 mb-8">
                  {formats.map((format) => (
                    <button type="button" key={format} onClick={() => setSelectedFormat(format)} className={filterClass(format === selectedFormat)}>
                      {format}
                    </button>
                  ))}
                </div>
                {visibleSessions.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-center py-12">Нет сеансов на выбранную дату в этом формате</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {visibleSessions.map((session) => (
                      <Link key={session.id} to={'/booking/' + movie.id + '/' + session.id}
                        className="bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-lg p-4 text-center">
                        <div className="text-xl font-bold mb-1">{session.time}</div>
                        <div className="text-xs text-[var(--text-muted)]">{session.format} • {session.price} ₽</div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between gap-4 text-sm text-[var(--text-muted)]">
          <span>КИНО. © 2026</span><span>Учебный проект • React + Flask</span>
        </div>
      </footer>
    </div>
  );
}
