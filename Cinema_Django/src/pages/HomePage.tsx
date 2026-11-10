import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

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
}

function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Все');

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch('/api/movies');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const records: Movie[] = await response.json();
        setMovies(records);
      } catch (error) {
        console.error('Ошибка загрузки фильмов:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, []);

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    movies.forEach((movie) => movie.genres?.forEach((g) => genres.add(g)));
    return ['Все', ...Array.from(genres)];
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const matchesSearch = !searchQuery.trim() ||
        movie.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = selectedGenre === 'Все' ||
        movie.genres?.includes(selectedGenre);
      return matchesSearch && matchesGenre;
    });
  }, [movies, searchQuery, selectedGenre]);

  // Первый фильм показываем в большом баннере.
  const featured = movies[0];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Загрузка...</p>
        </div>
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
            to="/my-tickets"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Мои билеты
          </Link>
        </div>
      </nav>

      {/* Большой баннер первого фильма */}
      {featured && (
        <section className="relative h-[85vh] overflow-hidden">
          <img
            src={featured.backdrop || featured.poster}
            alt={featured.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/80 to-transparent"></div>

          <div className="relative h-full max-w-7xl mx-auto px-6 flex items-end pb-20">
            <div className="max-w-2xl animate-fade-up">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-[var(--accent)] text-white text-xs font-semibold rounded">
                  В ПРОКАТЕ
                </span>
                <span className="text-[var(--text-muted)] text-sm">
                  {featured.genres?.[0]}
                </span>
              </div>
              <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-4 leading-none">
                {featured.title}
              </h1>
              <div className="flex items-center gap-4 mb-6 text-sm">
                <span className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span> {featured.rating}
                </span>
                <span className="text-[var(--text-muted)]">{featured.ageRating}</span>
                <span className="text-[var(--text-muted)]">{featured.duration} мин</span>
                <span className="text-[var(--text-muted)]">
                  {new Date(featured.releaseDate).getFullYear()}
                </span>
              </div>
              <p className="text-[var(--text-muted)] text-lg leading-relaxed mb-8 line-clamp-3">
                {featured.overview}
              </p>
              <Link
                to={`/movie/${featured.id}`}
                className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-8 py-4 rounded-lg font-semibold transition-colors"
              >
                Выбрать сеанс
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Фильтры */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Все фильмы</h2>

          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-80 px-5 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
          />
        </div>

        {/* Жанры */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-12">
          {allGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedGenre === genre
                  ? 'bg-white text-black'
                  : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Сетка фильмов */}
        {filteredMovies.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--text-muted)] text-lg">Ничего не найдено</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredMovies.map((movie, index) => (
              <Link
                key={movie.id}
                to={`/movie/${movie.id}`}
                className="group animate-fade-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[var(--surface)] mb-3 poster-hover">
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold">
                    <span className="text-yellow-400">★</span> {movie.rating}
                  </div>
                </div>
                <h3 className="font-semibold text-base leading-tight mb-1 group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                  {movie.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span>{movie.ageRating}</span>
                  <span>•</span>
                  <span>{movie.duration} мин</span>
                  <span>•</span>
                  <span>{new Date(movie.releaseDate).getFullYear()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Футер */}
      <footer className="border-t border-[var(--border)] mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            КИНО. © 2026
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Учебный проект • React + Django
          </p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;