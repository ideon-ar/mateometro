'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Art';
import { JoinForm } from '@/components/Panels';
import { configured, rpc } from '@/lib/supabase';
import { setSession } from '@/lib/session';
import { unlockAudio } from '@/lib/alerts';
import NotConfigured from '@/components/NotConfigured';
import Settings from '@/components/Settings';

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState('join');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!configured) return <NotConfigured />;

  const create = async ({ name, avatar }) => {
    setBusy(true);
    setError('');
    unlockAudio();
    try {
      const r = await rpc('create_room', { p_name: name, p_avatar: avatar });
      setSession(r.code, { role: 'ceb', room_id: r.room_id, token: r.token });
      router.push(`/r/${r.code}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const go = (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length === 4) router.push(`/r/${c}`);
  };

  return (
    <main className="wrap narrow">
      <div className="home-top rise">
        <Settings />
      </div>
      <div className="rise" style={{ '--i': 1 }}>
        <Header />
      </div>
      <div className="tabs rise" style={{ '--i': 2 }}>
        <button className={tab === 'join' ? 'act' : ''} onClick={() => setTab('join')}>
          Sumarme a una ronda
        </button>
        <button className={tab === 'ceb' ? 'act' : ''} onClick={() => setTab('ceb')}>
          Soy el cebador
        </button>
      </div>

      {tab === 'join' ? (
        <form className="form rise" key="join" onSubmit={go}>
          <h2>Sumarse a la ronda</h2>
          <p className="sub">Pedile el código de 4 letras al cebador (o abrí el link que te pasó).</p>
          <label>
            Código de la ronda
            <input
              className="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={4}
              placeholder="ABCD"
              autoFocus
            />
          </label>
          <button className="big" disabled={code.trim().length !== 4}>
            Entrar
          </button>
        </form>
      ) : (
        <JoinForm
          key="ceb"
          title="Armar una ronda nueva"
          subtitle="Vos cebás: pasás el mate, ordenás la ronda y te llegan los avisos cuando lo devuelven."
          cta="Crear ronda"
          withNickname={false}
          onSubmit={create}
          busy={busy}
          error={error}
        />
      )}

      <a className="foot-link rise" style={{ '--i': 4 }} href="/local.html">
        Versión local (una sola PC, sin internet) →
      </a>
    </main>
  );
}
