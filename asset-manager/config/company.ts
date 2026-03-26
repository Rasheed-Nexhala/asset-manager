/**
 * Company billing details for Purchase Order documents.
 * Used for letterhead, delivery block, and terms on PO PDFs / printouts.
 * Edit this file to update company details without redeploying.
 */
export interface CompanyConfig {
  /** Full legal name (billing block, deliver-to) */
  name: string;
  /** Short letterhead name on PO (e.g. IBF Engineering Services Pvt. Ltd.) */
  documentDisplayName: string;
  /** Line under logo, e.g. ISO certification */
  isoCertificationLine?: string;
  address: string;
  email: string;
  gstin: string;
  /** Company phones (comma / slash separated) */
  phones?: string;
  website?: string;
  cin?: string;
  /** Deliver To / yard section (goods delivery) */
  deliveryToName?: string;
  deliveryAddress?: string;
  deliveryContacts?: string;
  deliveryWebsite?: string;
  /** Main PO title in black bar */
  documentTitle?: string;
  /** Footer line under signatures */
  documentFooter?: string;
  /** Numbered terms (plain text; escaped when rendered) */
  termsAndConditions?: string[];
}

export const companyConfig: CompanyConfig = {
  name: 'IBF ENGINEERING SERVICES PRIVATE LIMITED',
  documentDisplayName: 'IBF Engineering Services Pvt. Ltd.',
  isoCertificationLine: 'An ISO 9001:2015 Certified Company',
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
