/**
 * Navigation parameter types for Request Stack
 */
export type RequestStackParamList = {
  RequestQueue: undefined;
  MyRequests: undefined;
  CreateRequest: { siteId: string };
  ProcessRequest: { requestId: string };
  EditRequest: { requestId: string };
  RejectRequest: { requestId: string };
  ConfirmTransfer: { requestId: string };
  ReturnItems: { requestId: string };
};
