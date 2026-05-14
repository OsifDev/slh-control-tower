import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [status, setStatus] = useState({});

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL + '/status')
      .then(res => res.json())
      .then(data => setStatus(data));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>SLH Control Tower</h1>
      <h2>Services: {status.services}</h2>
      <h2>Bots Active: {status.bots}</h2>
      <h2>Treasury: {status.treasury}</h2>
      <h2>Redis: {status.redis}</h2>
      <h2>Postgres: {status.postgres}</h2>
      <h2>AI Agents: {status.agents}</h2>
    </div>
  );
}
