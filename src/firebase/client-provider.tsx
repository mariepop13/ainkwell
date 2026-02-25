'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFirebaseClientConfig } from '@/firebase/config';

export interface FirebaseContextValue {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  areServicesAvailable: boolean;
  missingEnvKeys: string[];
}

export const FirebaseContext = createContext<FirebaseContextValue | null>(null);

function initializeFirebaseServices(): FirebaseContextValue {
  const config = getFirebaseClientConfig();

  if (!config.isConfigured) {
    return {
      app: null,
      auth: null,
      db: null,
      areServicesAvailable: false,
      missingEnvKeys: config.missingEnvKeys,
    };
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(config.firebaseOptions);

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    areServicesAvailable: true,
    missingEnvKeys: [],
  };
}

export function FirebaseClientProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  const value = useMemo(() => initializeFirebaseServices(), []);
  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebase(): FirebaseContextValue {
  const context = useContext(FirebaseContext);

  if (!context) {
    throw new Error('useFirebase must be used inside FirebaseClientProvider');
  }

  return context;
}
