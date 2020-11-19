/* eslint-disable no-unused-vars, camelcase */

// assert Client is exposed
import { Client, DefaultBinding_ICalculator } from './wsdl/calc/calc.wsdl';
import { Maybe } from '../src/utils/types';

// assert Client has correct shape
// eslint-disable-next-line no-unused-vars

const binding: DefaultBinding_ICalculator = {
  Add(
    input: { a?: Maybe<number>; b?: Maybe<number> } | { _xml: string },
    callback: (
      err: any,
      result: { result?: Maybe<number> },
      rawResponse: string,
      soapHeader: { [key: string]: any },
      rawRequest: string,
    ) => void,
    options?: { [key: string]: any },
    extraHeaders?: { [key: string]: any },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): void {},
  Subtract(
    input: { a?: Maybe<number>; b?: Maybe<number> } | { _xml: string },
    callback: (
      err: any,
      result: { result?: Maybe<number> },
      rawResponse: string,
      soapHeader: { [key: string]: any },
      rawRequest: string,
    ) => void,
    options?: { [key: string]: any },
    extraHeaders?: { [key: string]: any },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ): void {},
};

const client: Partial<Client> = {
  CalculatorService: {
    ICalculator: binding,
  },
  ...binding,
  AddAsync(
    input: { a?: Maybe<number>; b?: Maybe<number> } | { _xml: string },
    options?: { [key: string]: any },
    extraHeaders?: { [key: string]: any },
  ): Promise<
    [{ result?: Maybe<number> }, string, { [key: string]: any }, string]
  > {
    return new Promise<
      [{ result?: Maybe<number> }, string, { [key: string]: any }, string]
      // eslint-disable-next-line @typescript-eslint/no-empty-function
    >(() => {});
  },
  SubtractAsync(
    input: { a?: Maybe<number>; b?: Maybe<number> } | { _xml: string },
    options?: { [key: string]: any },
    extraHeaders?: { [key: string]: any },
  ): Promise<
    [{ result?: Maybe<number> }, string, { [key: string]: any }, string]
  > {
    return new Promise<
      [{ result?: Maybe<number> }, string, { [key: string]: any }, string]
      // eslint-disable-next-line @typescript-eslint/no-empty-function
    >(() => {});
  },
  describe() {
    return {};
  },
  setSecurity(security: {
    addOptions?: (options: { [key: string]: any }) => void;
    addHeaders?: (headers: { [key: string]: any }) => void;
    toXML: () => string;
    postProcess?: (xml: string, envelopeKey: string) => string;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  }) {},
  addSoapHeader(
    soapHeader: any,
    name?: string,
    namespace?: any,
    xmlns?: string,
  ) {
    return 1;
  },
  changeSoapHeader(
    index: number,
    soapHeader: any,
    name?: string,
    namespace?: string,
    xmlns?: string,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ) {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  clearSoapHeaders() {},
  getSoapHeaders() {
    return ['foo', 'bar'];
  },
  lastRequest: '',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setEndpoint(endpoint: string) {},
};
