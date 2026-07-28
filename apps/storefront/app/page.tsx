import { Button } from '@ucp/ui';
import { formatCurrencyIDR } from '@ucp/utils';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Selamat Datang di Toko UMKM</h1>
      <p>Contoh Harga Produk: {formatCurrencyIDR(150000)}</p>
      <Button>Belanja Sekarang</Button>
    </main>
  );
}
