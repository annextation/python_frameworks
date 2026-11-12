import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

function AdminPage() {
  const [token, setToken] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [checking, setChecking] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecking(true);
    setVerifiedToken('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/check', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Не удалось проверить ключ.');
      }
      setVerifiedToken(token);
      setMessage('Ключ подтверждён. Можно добавлять и удалять фильмы.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось проверить ключ.');
    } finally {
      setChecking(false);
    }
  }
  const [movies, setMovies] = useState<{ id: string; title: string }[]>([]);
  const [deleting, setDeleting] = useState('');

  async function loadMovies() {
    const response = await fetch('/api/movies');
    if (!response.ok) throw new Error('Не удалось загрузить список фильмов.');
    setMovies(await response.json());
  }

  useEffect(() => {
    loadMovies().catch((error) => setMessage(error.message));
  }, []);

  async function deleteMovie(id: string, title: string) {
    if (!verifiedToken) {
      setMessage('Сначала подтвердите ключ кнопкой «Войти».');
      return;
    }
    if (!window.confirm('Удалить фильм «' + title + '» и его сеансы?')) return;
    setDeleting(id);
    setMessage('');
    try {
      const response = await fetch('/api/admin/movies/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + verifiedToken },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.detail || 'Не удалось удалить фильм.');
      }
      setMovies((current) => current.filter((movie) => movie.id !== id));
      setMovieId((current) => current === id ? '' : current);
      setMessage('Фильм удалён.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось удалить фильм.');
    } finally {
      setDeleting('');
    }
  }
  const [message, setMessage] = useState('');
  const [movieId, setMovieId] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verifiedToken) {
      setMessage('Сначала подтвердите ключ кнопкой «Войти».');
      return;
    }
    const form = event.currentTarget;
    const fields = new FormData(form);
    setSaving(true);
    setMessage('');
    setMovieId('');
    try {
      const response = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + verifiedToken,
        },
        body: JSON.stringify({
          title: fields.get('title'),
          overview: fields.get('overview'),
          duration: Number(fields.get('duration')),
          releaseDate: fields.get('releaseDate'),
          rating: Number(fields.get('rating')),
          ageRating: fields.get('ageRating'),
          genres: String(fields.get('genres')).split(',').map((genre) => genre.trim()).filter(Boolean),
          poster: fields.get('poster'),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Проверь поля фильма.');
      }
      setMovies((current) => [{ id: data.id, title: String(fields.get('title')) }, ...current]);
      setMovieId(data.id);
      setMessage('Фильм добавлен в каталог.');
      form.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось сохранить фильм.');
    } finally {
      setSaving(false);
    }
  }

  const field = 'block w-full rounded border border-gray-500 bg-transparent px-3 py-2';

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/" className="underline">На главную</Link>
      <h1 className="my-5 text-3xl font-bold">Добавление фильма</h1>
      <form onSubmit={login} className="mb-5 grid gap-3">
        <label>Ключ администратора
          <input className={field} type="password" required disabled={checking || saving || Boolean(deleting)}
            value={token} onChange={(event) => {
              setToken(event.target.value);
              setVerifiedToken('');
              setMessage('');
            }} />
        </label>
        <button type="submit" disabled={checking || saving || Boolean(deleting)}
          className="rounded bg-blue-700 px-4 py-2 text-white">
          {checking ? 'Проверка…' : verifiedToken ? 'Ключ подтверждён' : 'Войти'}
        </button>
      </form>
      <form onSubmit={submit} className="grid gap-4">
        
        <label>Название<input className={field} name="title" required maxLength={200} /></label>
        <label>Описание<textarea className={field} name="overview" required maxLength={4000} /></label>
        <label>Дата выхода<input className={field} name="releaseDate" type="date" required /></label>
        <label>Длительность в минутах<input className={field} name="duration" type="number" min={1} max={600} required /></label>
        <label>Рейтинг<input className={field} name="rating" type="number" min={0} max={10} step={0.1} defaultValue={0} /></label>
        <label>Возрастное ограничение<input className={field} name="ageRating" defaultValue="0+" maxLength={10} /></label>
        <label>Жанры через запятую<input className={field} name="genres" /></label>
        <label>URL постера<input className={field} name="poster" type="url" maxLength={1000} /></label>
        <button type="submit" disabled={saving || !verifiedToken || checking} className="rounded bg-blue-700 px-4 py-2 text-white">
          {saving ? 'Сохранение…' : 'Добавить фильм'}
        </button>
      </form>
      {message && <p role="status" className="mt-4">{message}</p>}
      <section className="mt-8">
        <h2 className="mb-4 text-2xl">Фильмы в каталоге</h2>
        {movies.map((movie) => (
          <div key={movie.id} className="flex items-center justify-between gap-4 border-b border-gray-500 py-3">
            <Link to={'/movie/' + movie.id}>{movie.title}</Link>
            <button type="button" disabled={saving || Boolean(deleting) || !verifiedToken || checking} onClick={() => deleteMovie(movie.id, movie.title)}
              className="rounded bg-red-700 px-3 py-2 text-white">
              {deleting === movie.id ? 'Удаление…' : 'Удалить'}
            </button>
          </div>
        ))}
      </section>
      {movieId && <Link to={'/movie/' + movieId} className="underline">Открыть фильм</Link>}
    </main>
  );
}

export default AdminPage;
