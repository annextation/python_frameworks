import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, completePurchase, clearCart, removeItem } = useCartStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoError, setPromoError] = useState('');

  const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = (totalPrice * discount) / 100;
  const finalPrice = totalPrice - discountAmount;

  const handlePromoApply = () => {
    setPromoError('');
    if (promoCode === 'CINEMA10') {
      setDiscount(10);
      setAppliedPromo(promoCode);
    } else if (promoCode === 'WELCOME') {
      setDiscount(15);
      setAppliedPromo(promoCode);
    } else {
      setDiscount(0);
      setAppliedPromo('');
      setPromoError('Промокод недействителен');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert('Корзина пуста');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          promoCode: appliedPromo,
          items: items.map((item) => ({
            sessionId: item.session.id,
            seats: item.seats.map(({ row, seat }) => ({ row, seat })),
          })),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = response.status === 422
          ? 'Проверь данные заказа: номера ряда и места должны быть целыми числами.'
          : 'Не удалось оформить билеты';
        throw new Error(data?.error || message);
      }

      completePurchase();
      clearCart();

      navigate('/my-tickets');
    } catch (error) {
      console.error('Ошибка при оформлении:', error);
      alert(error instanceof Error ? error.message : 'Не удалось оформить билеты');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold mb-4">Корзина пуста</p>
          <Link to="/" className="text-[var(--accent)] hover:underline">
            ← На главную
          </Link>
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

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <div className="mb-10 animate-fade-up">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Оформление</h1>
          <p className="text-[var(--text-muted)]">Проверьте данные и завершите покупку</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Левая колонка — билеты */}
          <div className="lg:col-span-3 space-y-6 animate-fade-up">
            <h2 className="text-xl font-bold mb-4">Ваши билеты</h2>

            {items.map((item) => (
              <div
                key={item.id}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 relative group"
              >
                <button
                  onClick={() => removeItem(item.id)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                  title="Удалить билет"
                >
                  ✕
                </button>

                <div className="flex gap-4">
                  <img
                    src={item.movie.poster}
                    alt={item.movie.title}
                    className="w-20 h-28 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-2 truncate pr-8">
                      {item.movie.title}
                    </h3>
                    <div className="space-y-1 text-sm text-[var(--text-muted)]">
                      <p>
                        {' '}
                        {new Date(item.session.date).toLocaleDateString('ru-RU', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                      <p>
                         {item.session.time} • {item.session.format}
                      </p>
                      <p>
                        💺{' '}
                        {item.seats
                          .map((s) => `Ряд ${s.row}, Место ${s.seat}`)
                          .join(', ')}
                      </p>
                    </div>
                    <p className="mt-3 font-bold text-lg text-[var(--text)]">
                      {item.totalPrice} ₽
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {items.length > 1 && (
              <button
                onClick={clearCart}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-2"
              >
                🗑️ Очистить корзину
              </button>
            )}

            {/* Промокод */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="font-bold mb-4">Промокод</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoError('');
                  }}
                  placeholder="Введите код"
                  className="flex-1 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors placeholder-[var(--text-muted)]"
                />
                <button
                  onClick={handlePromoApply}
                  className="px-6 py-3 bg-[var(--surface-hover)] hover:bg-[var(--border)] rounded-lg text-sm font-medium transition-colors"
                >
                  Применить
                </button>
              </div>
              {discount > 0 && (
                <p className="mt-3 text-sm text-green-400">
                  ✓ Скидка {discount}% применена
                </p>
              )}
              {promoError && (
                <p className="mt-3 text-sm text-[var(--accent)]">{promoError}</p>
              )}
            </div>
          </div>

          {/* Правая колонка — форма и итог */}
          <div className="lg:col-span-2 space-y-6 animate-fade-up">
            {/* Итого */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 sticky top-24">
              <h3 className="font-bold mb-4">Итого</h3>

              <div className="space-y-3 mb-6 pb-6 border-b border-[var(--border)]">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Билетов:</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Сумма:</span>
                  <span>{totalPrice} ₽</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Скидка ({discount}%):</span>
                    <span>-{discountAmount} ₽</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-[var(--text-muted)]">К оплате:</span>
                <span className="text-2xl font-bold">{finalPrice} ₽</span>
              </div>

              {/* Форма */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                    Имя
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-lg shadow-[var(--accent)]/20"
                >
                  {isProcessing ? 'Оформление...' : `Оплатить ${finalPrice} ₽`}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;