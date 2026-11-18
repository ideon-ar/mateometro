# 🧉 mateometro 2.0

Cronómetro online para la ronda de mate: el cebador pasa el mate, el que toma avisa cuando lo devuelve, y todos ven en vivo quién se demora más.

## Qué tiene

- **Cebador** (el que crea la ronda): pasa el mate, ordena la ronda (◀ ▶), elige quién sigue tocando una tarjeta, saltea, pausa, reinicia y saca gente.
- **Participantes**: se suman con nombre, apodo (🎲 al azar) y avatar. Ven todo en vivo y tienen un solo botón: **"Devolví el mate"**. No pueden tocar nada del cebador.
- **Avisos** (sonido + notificación del sistema + pantalla titilando):
  - al cebador → "Fulano devolvió el mate"
  - al que toma → "¡Te pasaron el mate!"
  - a los dos → si alguien pasa los **2:30** con el mate (y un mensaje gracioso en su tarjeta)
- **Votación cada 10 mates**: ¿cambiamos la yerba? ¿calentamos el agua?
- **Ranking en vivo** por tiempo total o promedio.
- **Cerrar ronda** (cebador, arriba a la derecha): frena todos los tiempos y cierra la ronda para todos. Los que entren después ven el ranking final. Los participantes tienen ahí mismo **Salir de la ronda**.
- **Volver a tu ronda**: si tu navegador tiene una ronda abierta, el inicio te muestra un botón para volver.
- **Barra espaciadora** = botón principal (pasar / devolver).
- **Ajustes por usuario** (botón arriba a la derecha): tema claro / oscuro / automático, fondo de matecitos en movimiento o quieto, y sonido de avisos. Se guardan en el navegador de cada uno.
- Versión local de una sola PC en `/local.html`.

La seguridad no necesita login: al crear la ronda o sumarte, tu navegador guarda una clave secreta. Supabase solo acepta las acciones del cebador si vienen con la clave del cebador.

---

## 1. Supabase (5 min)

1. Entrá a [supabase.com](https://supabase.com) → **New project** (el plan gratis alcanza y sobra).
2. Andá a **SQL Editor → New query**, pegá todo el contenido de `supabase/schema.sql` y tocá **Run**. Tiene que decir *Success*.
3. Andá a **Project Settings → API** (o al botón **Connect**) y copiá:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public key** (o la *publishable key*, empieza con `sb_publishable_`)

> **¿Ya tenías el mateometro andando?** No hace falta correr todo de nuevo: pegá y corré `supabase/migracion_01_cerrar_ronda.sql` (agrega "Cerrar ronda"). Se puede correr más de una vez sin problema.

> Si en el paso 2 te tira error con `supabase_realtime`, andá a **Database → Publications → supabase_realtime** y activá la tabla `rooms`. Es lo que hace que todo se actualice al instante. Igual, si no está activado, la página se refresca sola cada 5 segundos.

## 2. Probar en tu PC (opcional)

```bash
npm install
cp .env.example .env.local   # y pegá la URL y la key
npm run dev                  # abrí http://localhost:3000
```

## 3. Subir a Vercel

1. Subí esta carpeta a un repo de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → elegí el repo (Vercel detecta Next.js solo).
3. En **Environment Variables** cargá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**. Listo: `https://tu-proyecto.vercel.app`

## Cómo se usa

1. El cebador entra → **Soy el cebador** → crea la ronda → le aparece un código de 4 letras y el botón **Copiar link**.
2. Cada uno abre el link en su PC → pone nombre, apodo y avatar → **Sumarme**.
3. Todos tocan **🔔 Activar avisos** arriba a la derecha (una sola vez por navegador).
4. El cebador ordena la ronda con ◀ ▶ según cómo están sentados y toca **Arrancar a cebar**.

Tip: si el navegador muestra "Avisos bloqueados", hay que habilitar las notificaciones del sitio desde el candadito 🔒 de la barra de direcciones.
