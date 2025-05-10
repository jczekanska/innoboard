import React, { useState, ChangeEvent, FormEvent, useContext } from 'react';
import type { ChangeEvent as CE, FormEvent as FE } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRules = [
    { regex: /.{8,}/, message: 'At least 8 characters' },
    { regex: /[A-Z]/, message: 'One uppercase letter' },
    { regex: /[a-z]/, message: 'One lowercase letter' },
    { regex: /[0-9]/, message: 'One number' },
    { regex: /[!@#$%^&*]/, message: 'One special character' },
  ];

type Mode = 'signup' | 'login';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext);

  const validate = () => {
    const errs: string[] = [];
    if (!emailRegex.test(email)) errs.push('Invalid email format');
    passwordRules.forEach(rule => {
      if (!rule.regex.test(password)) errs.push(rule.message);
    });
    if (mode === 'signup' && password !== confirmPassword) errs.push('Passwords do not match');
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (validationErrors.length) return;
    setIsSubmitting(true);
    setApiError('');
    try {
      const res = await fetch(`/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');

      // store & update context
      localStorage.setItem('access_token', data.access_token);
      setToken(data.access_token);

      navigate('/dashboard');
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded">
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setMode('signup')}
          className={`px-4 py-2 ${mode === 'signup' ? 'font-bold' : ''}`}
        >
          Sign Up
        </button>
        <button
          onClick={() => setMode('login')}
          className={`px-4 py-2 ${mode === 'login' ? 'font-bold' : ''}`}
        >
          Log In
        </button>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label className="block mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        {mode === 'signup' && (
          <div className="mb-4">
            <label className="block mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        )}
        {errors.length > 0 && (
          <ul className="text-red-600 mb-4 list-disc list-inside">
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        )}
        {apiError && <p className="text-red-600 mb-4">{apiError}</p>}
        <button
          type="submit"
          disabled={isSubmitting || validate().length > 0}
          className="w-full p-2 bg-blue-600 text-white rounded"
        >
          {isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Sign Up' : 'Log In'}
        </button>
      </form>
    </div>
  );
};

export default AuthPage;