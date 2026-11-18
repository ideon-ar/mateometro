'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Art';
import { JoinForm } from '@/components/Panels';
import { configured, rpc, supabase } from '@/lib/supabase';
import { setSession, listSessions, clearSession } from '@/lib/session';
import { unlockAudio } from '@/lib/alerts';
import NotConfigured from '@/components/NotConfigured';
import Settings from '@/components/Settings';

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState('join');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mine, setMine] = useState([]); // rondas abiertas en las que este navegador tiene sesión

  // Si hay sesiones guardadas, ver cuáles siguen abiertas (y borrar las de rondas cerradas o que ya no existen)
  useEffect(() => {
    if (!configured) return;
    const saved = listSessions();
    if (!saved.length) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from('rooms').select('id, code, closed').in('code', saved.map((s) => s.code));
      if (error || !alive) return;
      const open = [];
      for (const s of saved) {
        const r = data.find((x) => x.code === s.code);
        if (r && r.id === s.room_id && !r.closed) open.push(s);
        else clearSession(s.code);
      }
      setMine(open);
    })();
    return () => {
      alive = false;
    };
  }, []);

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
      {mine.length > 0 && (
        <div className="resume-list rise" style={{ '--i': 2 }}>
          {mine.map((s) => (
            <button key={s.code} className="resume" onClick={() => router.push(`/r/${s.code}`)}>
              <span className="resume-emoji">🧉</span>
              <span className="resume-txt">
                <span>
                  Volver a tu ronda <b>{s.code}</b>
                </span>
                <small>{s.role === 'ceb' ? 'Sos el cebador' : 'Estás en la ronda'}</small>
              </span>
              <svg viewBox="0 0 24 24" className="ico">
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>
      )}
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
