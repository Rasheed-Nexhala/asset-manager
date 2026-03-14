import { companyConfig } from '../config/company';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

/**
 * Full-screen loading state shown while the app resolves Firebase auth on startup.
 * Prevents flash of login/dashboard before auth state is known.
 * Matches mobile SplashOverlay: logo + app name.
 */
export function AuthCheckingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="flex flex-col items-center gap-4">
        <img
          src={companyConfig.splashIconPath}
          alt={companyConfig.logoAlt}
          className="h-[120px] w-[120px] object-contain"
        />
        <p className="text-[22px] font-semibold text-slate-900 tracking-tight">
          {companyConfig.appName}
        </p>
        <LoadingSpinner size="lg" />
        <p className="text-[13px] text-slate-500">Restoring your session</p>
      </div>
    </div>
  );
}
