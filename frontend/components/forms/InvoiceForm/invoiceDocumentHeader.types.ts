export type PreviewKind = "image" | "pdf" | "excel" | "none";

export type SetValue<T> = (value: T) => void;

export type InvoiceDocumentHeaderSectionProps = {
  docKind: string;
  setDocKind: SetValue<string>;

  invoiceType: string;
  onInvoiceTypeChange: SetValue<string>;

  invoiceName: string;
  setInvoiceName: SetValue<string>;

  documentDateTime: string;
  setDocumentDateTime: SetValue<string>;

  numeroRecibo: string;
  setNumeroRecibo: SetValue<string>;

  numeroFactura: string;
  setNumeroFactura: SetValue<string>;

  numeroControl: string;
  setNumeroControl: SetValue<string>;

  destination: string;
  setDestination: SetValue<string>;

  bank: string;
  setBank: SetValue<string>;

  caja: string;
  setCaja: SetValue<string>;

  paymentType: string;
  setPaymentType: SetValue<string>;

  referenceNumber: string;
  setReferenceNumber: SetValue<string>;

  voucherUrl?: string;
  setVoucherUrl?: SetValue<string>;
};