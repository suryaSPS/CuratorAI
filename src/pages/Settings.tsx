import { useEffect, useState } from 'react';
import { User, Bell, Shield, Palette, Globe, Database } from 'lucide-react';

export default function Settings() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((data) => setUserName(data.name ?? ''))
      .catch(() => {});
  }, []);

  const initials = userName
    ? userName
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-4xl">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-2">Settings</h1>
        <p className="text-on-surface-variant max-w-md leading-relaxed">
          Manage your account preferences and application settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Settings Navigation */}
        <div className="col-span-1 space-y-2">
          {[
            { icon: User, label: 'Profile', active: true },
            { icon: Bell, label: 'Notifications', active: false },
            { icon: Shield, label: 'Privacy & Security', active: false },
            { icon: Palette, label: 'Appearance', active: false },
            { icon: Globe, label: 'Language', active: false },
            { icon: Database, label: 'Data Export', active: false },
          ].map((item, i) => (
            <button
              key={i}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                item.active
                  ? 'bg-secondary/10 text-secondary'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-primary'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="col-span-1 md:col-span-3 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-primary mb-6">Profile Information</h3>

            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-full bg-primary-container text-white flex items-center justify-center text-2xl font-bold select-none">
                {initials}
              </div>
              <div>
                <p className="text-sm font-bold text-primary mb-1">{userName || 'Set your name'}</p>
                <p className="text-xs text-slate-400">
                  Your name is configured via the <code className="bg-slate-100 px-1 rounded">USER_NAME</code> environment variable.
                </p>
              </div>
            </div>

            <div className="p-4 bg-surface-container-low rounded-2xl border border-slate-200 text-sm text-on-surface-variant">
              <p className="font-semibold text-primary mb-1">How to update your profile</p>
              <p>
                Set <code className="bg-white px-1 rounded border border-slate-200">USER_NAME</code> in your{' '}
                <code className="bg-white px-1 rounded border border-slate-200">.env</code> file and restart the server.
                Example: <code className="bg-white px-1 rounded border border-slate-200">USER_NAME="Your Name"</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
