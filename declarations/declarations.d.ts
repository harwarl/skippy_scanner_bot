declare module "abi-decoder" {
  const abiDecoder: {
    addABI: (abiArray: any[]) => void;
    decodeLogs: (logs: any[]) => any[];
  };

  export = abiDecoder;
}
