import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import useAuthStore from '../../store/authStore';

function Signup() {
  const { signUp, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await signUp(form);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-brand-500/20">
            <Brain size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Join NeuroFlow</h1>
          <p className="text-slate-500 mt-1.5">Your team's autonomous intelligence system</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-200 mb-6">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
              <input
                className="input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Alex Johnson"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3">
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
