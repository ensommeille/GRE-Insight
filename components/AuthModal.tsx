import React, { useState } from 'react';
import { CloseIcon, SpinnerIcon } from './Icons';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let user: User;
      if (isRegister) {
        user = await authService.register(formData.email, formData.password, formData.name);
      } else {
        user = await authService.login(formData.email, formData.password);
      }
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-stone-200 dark:border-stone-700 relative overflow-hidden">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold font-serif text-stone-800 dark:text-stone-100">
            {isRegister ? 'Join GRE Insight' : 'Welcome Back'}
          </h2>
          <p className="text-stone-500 text-sm mt-1">
            {isRegister ? 'Sync your progress across devices' : 'Login to access your word book'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name</label>
              <input 
                type="text" 
                required
                className="w-full bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-2.5 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-400"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-2.5 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-400"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Password</label>
            <input 
              type="password" 
              required
              minLength={6}
              className="w-full bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-2.5 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-400"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 font-bold py-3 rounded-xl hover:bg-stone-700 dark:hover:bg-stone-200 transition-all flex justify-center items-center gap-2"
          >
            {loading && <SpinnerIcon className="w-5 h-5" />}
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            className="text-stone-500 text-sm hover:underline"
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
          >
            {isRegister ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};