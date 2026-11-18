import { Header } from './Art';

export default function NotConfigured() {
  return (
    <main className="wrap narrow">
      <Header />
      <div className="form">
        <h2>Falta conectar Supabase</h2>
        <p className="sub">
          Cargá las variables <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en
          Vercel (Settings → Environment Variables) o en un archivo <code>.env.local</code>, y volvé a deployar.
        </p>
      </div>
    </main>
  );
}
