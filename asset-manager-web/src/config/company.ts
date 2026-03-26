/**
 * Company billing details and branding.
 * Used for Purchase Order documents, auth logo, and app display name.
 * Edit this file to update company details without redeploying.
 */
export interface CompanyConfig {
  name: string;
  /** Short display name for app header/sidebar (e.g. "IBF Asset Manager") */
  appName: string;
  /** Letterhead short name on PO PDF */
  documentDisplayName: string;
  /** Line under logo on PO, e.g. ISO certification */
  isoCertificationLine?: string;
  /** Path to company logo (in public folder, e.g. /assets/IBF_logo.png) */
  logoPath: string;
  /** Path to app/splash icon for loading screens */
  splashIconPath: string;
  /** Alt text for logo (e.g. "IBF Engineering Services logo") */
  logoAlt: string;
  address: string;
  email: string;
  gstin: string;
  phones?: string;
  website?: string;
  cin?: string;
  deliveryToName?: string;
  deliveryAddress?: string;
  deliveryContacts?: string;
  deliveryWebsite?: string;
  documentTitle?: string;
  documentFooter?: string;
  termsAndConditions?: string[];
}

export const companyConfig: CompanyConfig = {
  name: 'IBF ENGINEERING SERVICES PRIVATE LIMITED',
  appName: 'IBF Asset Manager',
  documentDisplayName: 'IBF Engineering Services Pvt. Ltd.',
  isoCertificationLine: 'An ISO 9001:2015 Certified Company',
  logoPath: '/assets/IBF_logo.png',
  splashIconPath: '/assets/splash-icon.png',
  logoAlt: 'IBF Engineering Services logo',
  address:
    'Door No. 19 & 20, 2nd Floor, Gousia Complex, Opp. Service Bus Stand, Surathkal - 575014, Mangalore (D.K.)',
  email: 'ibf.engineeringservices@gmail.com',
  gstin: '29AAECI6912L1Z6',
  phones: '0824-2980980, 7676565638/75',
  website: 'www.ibfengineering.com',
  cin: 'U74999KA2017PTC108190',
  deliveryToName: 'IBF ENGINEERING SERVICES PRIVATE LIMITED',
  deliveryAddress:
    'IBF FABRICATION YARD KUTHETHOOR NEAR CISF QUATRUS, KUTHETHOOR MANGALORE, DK, INDIA',
  deliveryContacts:
    '8971337140 / ibf.engineeringservices@gmail.com / planning.ibf@gmail.com',
  deliveryWebsite: 'www.ibfengineering.com',
  documentTitle: 'PURCHASE / SERVICE ORDER',
  documentFooter: 'IBF Engineering Services Pvt Ltd',
  termsAndConditions: [
    'Delivery shall be made on or before the date mentioned in this Purchase Order unless otherwise agreed in writing.',
    'The scope of supply shall be strictly as per this Purchase Order and any technical specifications referred to herein.',
    'Payment terms shall be as per mutual agreement / company policy unless stated otherwise on this order.',
    'Applicable taxes (GST) shall be charged as per prevailing statutory rates and as shown in this document.',
    'This Purchase Order must be acknowledged and accepted by the supplier within the stipulated timeframe.',
  ],
};
