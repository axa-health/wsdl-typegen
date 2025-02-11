import type { Client as SoapClient } from 'soap';

export type Operation_element = Operation;
export type Add_element = {
  a?: number | null | undefined;
  b?: number | null | undefined;
};
export type AddResponse_element = {
  result?: number | null | undefined;
};
export type Subtract_element = {
  a?: number | null | undefined;
  b?: number | null | undefined;
};
export type SubtractResponse_element = {
  result?: number | null | undefined;
};

export type Operation = {
  attributes?: {
    symbol?: string | null | undefined;
    fullDescription?: string | null | undefined;
    errorCode?: number | null | undefined;
  };
};
export type Error = {
  Code: number;
};
export type AddOperation = Operation & {
  attributes: {
    symbol: 'Add Operation';
    errorCode: 12;
  };
};

export interface Client extends SoapClient {
  CalculatorService: CalculatorService;

  Add: (
    input: ICalculator_Add_InputMessage__parameters | { _xml: string },
    cb: (
      err: any | null | undefined,
      result: ICalculator_Add_OutputMessage__parameters,
      rawResponse: string,
      soapHeader: { [key: string]: any },
      rawRequest: string,
    ) => void,
    options?: { [key: string]: any },
    extraHeaders?: { [key: string]: any },
  ) => void;
  AddAsync: (
    input: ICalculator_Add_InputMessage__parameters | { _xml: string },
    options?: { [key: string]: any },
    extraHeaders?: { [key: string]: any },
  ) => Promise<
    [ICalculator_Add_OutputMessage__parameters, string, Object, string]
  >;
  Subtract: (
    input: ICalculator_Subtract_InputMessage__parameters | { _xml: string },
    cb: (
      err: any | null | undefined,
      result: ICalculator_Subtract_OutputMessage__parameters,
      rawResponse: string,
      soapHeader: { [key: string]: any },
      rawRequest: string,
    ) => void,
    options?: { [key: string]: any },
    extraHeaders?: { [key: string]: any },
  ) => void;
  SubtractAsync: (
    input: ICalculator_Subtract_InputMessage__parameters | { _xml: string },
    options?: { [key: string]: any },
    extraHeaders?: { [key: string]: any },
  ) => Promise<
    [ICalculator_Subtract_OutputMessage__parameters, string, Object, string]
  >;
}

export type CalculatorService = {
  ICalculator: DefaultBinding_ICalculator;
};

export type DefaultBinding_ICalculator = {
  Add: (
    input: ICalculator_Add_InputMessage__parameters | { _xml: string },
    cb: (
      err: any | null | undefined,
      result: ICalculator_Add_OutputMessage__parameters,
      rawResponse: string,
      soapHeader: { [key: string]: any },
      rawRequest: string,
    ) => void,
    options?: { [key: string]: any },
    extraHeaders?: { [key: string]: any },
  ) => void;
  Subtract: (
    input: ICalculator_Subtract_InputMessage__parameters | { _xml: string },
    cb: (
      err: any | null | undefined,
      result: ICalculator_Subtract_OutputMessage__parameters,
      rawResponse: string,
      soapHeader: { [key: string]: any },
      rawRequest: string,
    ) => void,
    options?: { [key: string]: any },
    extraHeaders?: { [key: string]: any },
  ) => void;
};

export type ICalculator_Add_InputMessage__parameters = Add_element;
export type ICalculator_Add_OutputMessage__parameters = AddResponse_element;
export type ICalculator_Subtract_InputMessage__parameters = Subtract_element;
export type ICalculator_Subtract_OutputMessage__parameters =
  SubtractResponse_element;
