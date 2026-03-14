import { clsx } from 'clsx';
import { companyConfig } from '../../config/company';

interface AuthLogoProps {
  className?: string;
  width?: number;
}

/**
 * Logo/branding for auth screens.
 * Uses company logo image from config (matches mobile app).
 */
export function AuthLogo({ className, width = 200 }: AuthLogoProps) {
  return (
    <div
      className={clsx('flex items-center justify-center', className)}
      role="img"
      aria-label={companyConfig.logoAlt}
    >
      <img
        src={companyConfig.logoPath}
        alt={companyConfig.logoAlt}
        className="object-contain"
        style={{ width, height: width * 0.4 }}
      />
    </div>
  );
}
