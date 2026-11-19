// Identificador de esta publicación: la página lo compara con /api/version para avisar cuando hay una nueva
const build = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'dev';

/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true, env: { NEXT_PUBLIC_BUILD: build } };
export default nextConfig;
