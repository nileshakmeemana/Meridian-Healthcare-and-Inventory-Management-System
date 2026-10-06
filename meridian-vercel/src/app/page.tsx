'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';

export default function Home() {
  const { token, hydrated } = useAuth();
  const router = useRouter();
  useEffect(() => { if (hydrated) router.replace(token ? '/dashboard' : '/login'); }, [hydrated, token, router]);
  return null;
}
