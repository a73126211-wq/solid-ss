import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getProfile } from '../lib/auth';

export function AuthGate() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<import('../lib/types').Profile | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const p = await getProfile();
        setProfile(p);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN') {
          const p = await getProfile();
          setProfile(p);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !profile) {
      const returnTo = location.pathname + location.search;
      navigate(`/login?next=${encodeURIComponent(returnTo)}`, { replace: true });
    }
  }, [loading, profile, navigate, location]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-pulse h-10 w-10 bg-black rounded-full mb-3" />
        <p className="text-gray-500 font-cairo">جاري التحميل...</p>
      </div>
    );
  }

  return <Outlet />;
}
