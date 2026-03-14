/**
 * Company billing details and branding.
 * Used for Purchase Order documents, auth logo, and app display name.
 * Edit this file to update company details without redeploying.
 */
export interface CompanyConfig {
  name: string;
  /** Short display name for app header/sidebar (e.g. "IBF Asset Manager") */
  appName: string;
  /** Path to company logo (in public folder, e.g. /assets/IBF_logo.png) */
  logoPath: string;
  /** Path to app/splash icon for loading screens */
  splashIconPath: string;
  /** Alt text for logo (e.g. "IBF Engineering Services logo") */
  logoAlt: string;
  address: string;
  email: string;
  gstin: string;
}

export const companyConfig: CompanyConfig = {
  name: 'IBF ENGINEERING SERVICES PRIVATE LIMITED',
  appName: 'IBF Asset Manager',
  logoPath: '/assets/IBF_logo.png',
  splashIconPath: '/assets/splash-icon.png',
  logoAlt: 'IBF Engineering Services logo',
  address:
    'Door No:5-7/19 & 20,\nGousia Complex, 2nd Floor,\nOpp. Service busstop, Surathkal,\nD.K. Mangalore- 575014',
  email: 'ibf.engineeringservices@gmail.com',
  gstin: '29AAECI6912L1Z6',
};
