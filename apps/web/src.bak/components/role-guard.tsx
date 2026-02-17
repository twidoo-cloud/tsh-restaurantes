'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { usePermissions } from '@/lib/use-permissions';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps a page and redirects unauthorized users.
 * Shows an access denied message briefly before redirecting.
 */
export function RoleGuard({ children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasAccess, role } = usePermissions();
  const [checked, setChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Check if user has access to this route
    const allowed = hasAccess(pathname);
    setAuthorized(allowed);
    setChecked(true);

    if (!allowed) {
      // Redirect after 2 seconds
      const timer = setTimeout(() => {
        // Redirect to the most appropriate page for their role
        if (role === 'kitchen') {
          router.replace('/kitchen');
        } else if (role === 'waiter') {
          router.replace('/tables');
        } else {
          router.replace('/pos');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pathname, hasAccess, role, router]);

  if (!checked) return null;

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert size={32} className="text-red-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Acceso Denegado</h2>
          <p className="mt-2 text-sm text-gray-500">
            Tu rol de <span className="font-semibold capitalize">{role}</span> no tiene permisos para acceder a esta sección.
          </p>
          <p className="mt-1 text-xs text-gray-400">Redirigiendo...</p>
          <button
            onClick={() => router.back()}
            className="mt-4 flex items-center justify-center gap-2 mx-auto rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <ArrowLeft size={16} /> Volver
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
