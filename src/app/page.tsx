'use client';

import { useFirebase } from '@/firebase/client-provider';

const REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

export default function HomePage(): JSX.Element {
  const firebase = useFirebase();

  if (!firebase.areServicesAvailable) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-2xl rounded-lg border bg-card p-6 text-card-foreground">
          <h1 className="mb-3 text-2xl font-headline font-bold">Firebase configuration required</h1>
          <p className="mb-4 text-muted-foreground">
            Fill your Firebase placeholders in <code className="rounded bg-muted px-2 py-1">.env.local</code>.
          </p>
          <ul className="space-y-1 text-sm">
            {REQUIRED_ENV_KEYS.map((key) => (
              <li key={key} className="font-mono">
                {firebase.missingEnvKeys.includes(key) ? `- [missing] ${key}` : `- [ok] ${key}`}
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-lg border bg-card p-6 text-card-foreground">
        <h1 className="mb-3 text-2xl font-headline font-bold">Ainkwell is ready</h1>
        <p className="text-muted-foreground">
          Firebase client is initialized. You can now build your app features.
        </p>
      </div>
    </main>
  );
}
