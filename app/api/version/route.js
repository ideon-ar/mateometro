// Devuelve qué versión está publicada ahora. Es estático: cada publicación tiene el suyo.
export const dynamic = 'force-static';

export function GET() {
  return Response.json({ build: process.env.NEXT_PUBLIC_BUILD || 'dev' });
}
