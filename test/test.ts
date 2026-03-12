/* eslint-disable @typescript-eslint/no-unused-vars, camelcase */

// assert Client is exposed
import type { Client, DefaultBinding_ICalculator } from './wsdl/calc/calc.wsdl.js';

// assert Client has correct shape
const binding: DefaultBinding_ICalculator = {
  Add(
    _input: { a?: number | null | undefined; b?: number | null | undefined } | { _xml: string },
    _callback: (
      err: any,
      result: { result?: number | null | undefined },
      rawResponse: string,
      soapHeader: { [key: string]: any },
      rawRequest: string,
    ) => void,
    _options?: { [key: string]: any },
    _extraHeaders?: { [key: string]: any },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): void {},
  Subtract(
    _input: { a?: number | null | undefined; b?: number | null | undefined } | { _xml: string },
    _callback: (
      err: any,
      result: { result?: number | null | undefined },
      rawResponse: string,
      soapHeader: { [key: string]: any },
      rawRequest: string,
    ) => void,
    _options?: { [key: string]: any },
    _extraHeaders?: { [key: string]: any },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): void {},
};

const _client: Partial<Client> = {
  CalculatorService: {
    ICalculator: binding,
  },
  ...binding,
  AddAsync(
    _input: { a?: number | null | undefined; b?: number | null | undefined } | { _xml: string },
    _options?: { [key: string]: any },
    _extraHeaders?: { [key: string]: any },
  ): Promise<[{ result?: number | null | undefined }, string, { [key: string]: any }, string]> {
    return new Promise<
      [{ result?: number | null | undefined }, string, { [key: string]: any }, string]
      // eslint-disable-next-line @typescript-eslint/no-empty-function
    >(() => {});
  },
  SubtractAsync(
    _input: { a?: number | null | undefined; b?: number | null | undefined } | { _xml: string },
    _options?: { [key: string]: any },
    _extraHeaders?: { [key: string]: any },
  ): Promise<[{ result?: number | null | undefined }, string, { [key: string]: any }, string]> {
    return new Promise<
      [{ result?: number | null | undefined }, string, { [key: string]: any }, string]
      // eslint-disable-next-line @typescript-eslint/no-empty-function
    >(() => {});
  },
  describe() {
    return {};
  },
  setSecurity(_security: {
    addOptions?: (options: { [key: string]: any }) => void;
    addHeaders?: (headers: { [key: string]: any }) => void;
    toXML: () => string;
    postProcess?: (xml: string, envelopeKey: string) => string;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  }) {},
  addSoapHeader(_soapHeader: any, _name?: string, _namespace?: any, _xmlns?: string) {
    return 1;
  },
  changeSoapHeader(
    _index: number,
    _soapHeader: any,
    _name?: string,
    _namespace?: string,
    _xmlns?: string,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ) {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  clearSoapHeaders() {},
  getSoapHeaders() {
    return ['foo', 'bar'];
  },
  lastRequest: '',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setEndpoint(_endpoint: string) {},
};
