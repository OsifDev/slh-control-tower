import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

function Clock() {
  const [time, setTime] = useState(null);
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!time) return <span className="text-sm text-gray-600">--:--:--</span>;
  return <span className="text-sm text-gray-400">{time.toLocaleTimeString()} UTC</span>;
}

export default function Dashboard() {
  const [status, setStatus] = useState({});
  const [events, setEvents] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(process.env.NEXT_PUBLIC_API_URL + '/status')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(() => router.push('/login'));

    const wsStatus = new WebSocket('ws://localhost:8000/ws');
    wsStatus.onmessage = (event) => setStatus(JSON.parse(event.data));
    wsStatus.onerror = () => console.log('Status WS error');

    const wsEvents = new WebSocket('ws://localhost:8000/ws/events');
    wsEvents.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [data, ...prev].slice(0, 10));
    };
    wsEvents.onerror = () => console.log('Event WS error');

    return () => {
      wsStatus.close();
      wsEvents.close();
    };
  }, []);

  const bots = [
    { name: 'Guardian', status: status.bots === '--' ? 'Offline' : 'Active' },
    { name: 'Wallet', status: status.bots === '--' ? 'Offline' : 'Active' },
    { name: 'Airdrop', status: status.bots === '--' ? 'Offline' : 'Active' },
    { name: 'Game', status: status.bots === '--' ? 'Offline' : 'Active' },
    { name: 'Analytics', status: status.bots === '--' ? 'Offline' : 'Active' },
    { name: 'Notifier', status: status.bots === '--' ? 'Offline' : 'Active' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <header className="flex justify-between items-center p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
          <h1 className="text-xl font-bold">SLH CONTROL TOWER</h1>
        </div>
        <Clock />
      </header>

      <main className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase">Services</p>
            <p className="text-2xl font-bold text-green-400">{status.services || '--'}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase">Bots Active</p>
            <p className="text-2xl font-bold text-blue-400">{status.bots || '--'}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase">Treasury</p>
            <p className="text-2xl font-bold text-yellow-400">{status.treasury || '--'}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase">AI Agents</p>
            <p className="text-2xl font-bold text-purple-400">{status.agents || '--'}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase">Redis</p>
            <p className={`text-2xl font-bold ${status.redis==='OK'?'text-green-400':'text-red-400'}`}>{status.redis || '--'}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs uppercase">Postgres</p>
            <p className={`text-2xl font-bold ${status.postgres==='OK'?'text-green-400':'text-red-400'}`}>{status.postgres || '--'}</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Telegram Bots</h2>
          <div className="space-y-2">
            {bots.map((bot, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-gray-800 py-1">
                <span>{bot.name}</span>
                <span className={bot.status === 'Active' ? 'text-green-400' : 'text-red-400'}>● {bot.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">Live Event Stream</h2>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {events.length === 0 && <p className="text-gray-600">Awaiting events...</p>}
            {events.map((e, i) => (
              <div key={i} className="text-sm text-gray-400 border-b border-gray-800 py-1">
                <span className="text-blue-400 font-mono">{e.event_type}</span> – {e.payload}
                <span className="text-gray-600 ml-2 text-xs">{e.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}