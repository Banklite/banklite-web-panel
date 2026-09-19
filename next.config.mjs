/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js compila usando varios "workers" en paralelo con memoria compartida
  // (/dev/shm). Docker Desktop en Windows le da muy poco espacio a /dev/shm por
  // defecto, y eso hace que el build muera con SIGBUS. Forzamos un solo worker
  // sin hilos compartidos para que la compilacion no dependa de ese espacio.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
