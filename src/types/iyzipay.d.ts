// Minimal ambient declaration for the iyzipay Node SDK (no official types).
// We narrow the surface further in src/lib/payments/iyzico.ts via an
// IyzipayClient interface — this file only needs to make `import Iyzipay`
// type-safe.
declare module "iyzipay" {
  const Iyzipay: new (config: {
    apiKey: string;
    secretKey: string;
    uri: string;
  }) => unknown;
  export default Iyzipay;
}
