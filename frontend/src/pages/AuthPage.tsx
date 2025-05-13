// src/pages/AuthPage.tsx
import React, {
  useState,
  useContext,
  useEffect,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';

type Mode = "signup" | "login";

interface AuthPageProps {
  initialMode?: Mode;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRules = [
  { regex: /.{8,}/, message: 'At least 8 characters' },
  { regex: /[A-Z]/, message: 'One uppercase letter' },
  { regex: /[a-z]/, message: 'One lowercase letter' },
  { regex: /[0-9]/, message: 'One number' },
  { regex: /[!@#$%^&*]/, message: 'One special character' },
];

const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'signup' }) => {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useContext(AuthContext);

  useEffect(() => {
    setMode(initialMode);
    setErrors([]);
    setApiError("");
    setWasSubmitted(false);
  }, [initialMode]);
  
  const validate = () => {
    const errs: string[] = [];
    if (!emailRegex.test(email)) errs.push('Please enter a valid email address');
    if (!password) errs.push('Please enter your password');
    if (mode === 'signup') {
      passwordRules.forEach((r) => {
        if (!r.regex.test(password)) errs.push(r.message);
      });
      if (password !== confirmPassword) errs.push('Passwords do not match');
    }
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setWasSubmitted(true);
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
      if (!res.ok) throw new Error(data.detail ?? 'Error');

      localStorage.setItem('access_token', data.access_token);
      setToken(data.access_token);
      const next = new URLSearchParams(location.search).get('next') || '/dashboard';
      navigate(next, { replace: true });
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Innoboard</CardTitle>
          <CardDescription className="text-center">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
          <TabsList className="h-12 grid grid-cols-2 w-full bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden">
            <TabsTrigger
              value="signup"
              className="data-[state=active]:bg-white data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400"
            >
              Sign Up
            </TabsTrigger>
            <TabsTrigger
              value="login"
              className="data-[state=active]:bg-white data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400"
            >
              Log In
            </TabsTrigger>
          </TabsList>

          {/* Signup */}
          <TabsContent value="signup">
            <form onSubmit={handleSubmit} noValidate>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {wasSubmitted && errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside text-sm">
                        {errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {apiError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{apiError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          {/* Login */}
          <TabsContent value="login">
            <form onSubmit={handleSubmit} noValidate>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">Email</Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password-login">Password</Label>
                  </div>
                  <Input
                    id="password-login"
                    type="password"
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {wasSubmitted && errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside text-sm">
                        {errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {apiError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{apiError}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AuthPage;
