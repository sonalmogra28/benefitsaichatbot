'use client';

import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function AuthForm({
  action,
  children,
  defaultEmail = '',
}: {
  action: (email: string, password: string) => Promise<void>;
  children: React.ReactNode;
  defaultEmail?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await action(email, password);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 px-4 sm:px-16"
    >
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-zinc-600 font-normal dark:text-zinc-400"
        >
          Email Address
        </Label>

        <Input
          id="email"
          name="email"
          className="bg-muted text-md md:text-sm"
          type="email"
          placeholder="user@acme.com"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="text-zinc-600 font-normal dark:text-zinc-400"
        >
          Password
        </Label>

        <Input
          id="password"
          name="password"
          className="bg-muted text-md md:text-sm"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.targe.value)}
        />
      </div>

      {children}
    </form>
  );
}
