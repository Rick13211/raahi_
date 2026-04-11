'use client'
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map/MapCanvas'), { 
  ssr: false,
  loading: () => <p>Loading Map...</p>
});

export default function Page() {
  return (
    <main>
      <h1>My Next.js Map</h1>
      <Map />
    </main>
  );
}