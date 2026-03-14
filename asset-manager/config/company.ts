/**
 * Company billing details for Purchase Order documents.
 * Used as preset for the "Billing Address" section in PO PDFs.
 * Edit this file to update company details without redeploying.
 */
export interface CompanyConfig {
  name: string;
  address: string;
  email: string;
  gstin: string;
}

export const companyConfig: CompanyConfig = {
  name: 'IBF ENGINEERING SERVICES PRIVATE LIMITED',
  address:
    'Door No:5-7/19 & 20,\nGousia Complex, 2nd Floor,\nOpp. Service busstop, Surathkal,\nD.K. Mangalore- 575014',
  email: 'ibf.engineeringservices@gmail.com',
  gstin: '29AAECI6912L1Z6',
};
