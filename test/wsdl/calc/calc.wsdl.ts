import type { Client as SoapClient } from 'soap';

export type Operation_element = Operation;

/**
 * Request element for the Add operation.
 */
export type Add_element = {
  /**
   * The first operand.
   */
  a?: number | null | undefined;
  /**
   * The second operand.
   */
  b?: number | null | undefined;
};

export type AddResponse_element = {
  /**
   * The sum of operands a and b.
   */
  result?: number | null | undefined;
};

/**
 * Request element for the Subtract operation.
 */
export type Subtract_element = {
  a?: number | null | undefined;
  b?: number | null | undefined;
};

export type SubtractResponse_element = {
  result?: number | null | undefined;
};

/**
 * Base type for all calculator operations.
 * Contains tracking and error metadata.
 */
export type Operation = {
  attributes?: {
    /**
     * The mathematical symbol (e.g., +, -).
     */
    symbol?: string;
    fullDescription?: string;
    errorCode?: number;
  };
};

/**
 * Standard error container for SOAP faults.
 */
export type Error = {
  /**
   * A short integer representing the specific error condition.
   */
  Code: number;
};

/**
 * Specific extension for the Addition logic.
 */
export type AddOperation = Operation & {
  attributes: {
    symbol: 'Add Operation';
    errorCode: 12;
  };
};

export interface Client extends SoapClient {
  CalculatorService: CalculatorService;
  Add: (
    input:
      | ICalculator_Add_InputMessage__parameters
      | {
          _xml: string;
        },
    cb: (
      err: unknown,
      result: ICalculator_Add_OutputMessage__parameters,
      rawResponse: string,
      soapHeader: Record<string, unknown>,
      rawRequest: string,
    ) => void,
    options?: Record<string, unknown>,
    extraHeaders?: Record<string, unknown>,
  ) => void;
  AddAsync: (
    input:
      | ICalculator_Add_InputMessage__parameters
      | {
          _xml: string;
        },
    options?: Record<string, unknown>,
    extraHeaders?: Record<string, unknown>,
  ) => Promise<
    [
      ICalculator_Add_OutputMessage__parameters,
      string,
      Record<string, unknown>,
      string,
    ]
  >;
  Subtract: (
    input:
      | ICalculator_Subtract_InputMessage__parameters
      | {
          _xml: string;
        },
    cb: (
      err: unknown,
      result: ICalculator_Subtract_OutputMessage__parameters,
      rawResponse: string,
      soapHeader: Record<string, unknown>,
      rawRequest: string,
    ) => void,
    options?: Record<string, unknown>,
    extraHeaders?: Record<string, unknown>,
  ) => void;
  SubtractAsync: (
    input:
      | ICalculator_Subtract_InputMessage__parameters
      | {
          _xml: string;
        },
    options?: Record<string, unknown>,
    extraHeaders?: Record<string, unknown>,
  ) => Promise<
    [
      ICalculator_Subtract_OutputMessage__parameters,
      string,
      Record<string, unknown>,
      string,
    ]
  >;
}

export type CalculatorService = {
  ICalculator: DefaultBinding_ICalculator;
};

export type DefaultBinding_ICalculator = {
  Add: (
    input:
      | ICalculator_Add_InputMessage__parameters
      | {
          _xml: string;
        },
    cb: (
      err: unknown,
      result: ICalculator_Add_OutputMessage__parameters,
      rawResponse: string,
      soapHeader: Record<string, unknown>,
      rawRequest: string,
    ) => void,
    options?: Record<string, unknown>,
    extraHeaders?: Record<string, unknown>,
  ) => void;
  Subtract: (
    input:
      | ICalculator_Subtract_InputMessage__parameters
      | {
          _xml: string;
        },
    cb: (
      err: unknown,
      result: ICalculator_Subtract_OutputMessage__parameters,
      rawResponse: string,
      soapHeader: Record<string, unknown>,
      rawRequest: string,
    ) => void,
    options?: Record<string, unknown>,
    extraHeaders?: Record<string, unknown>,
  ) => void;
};

export type ICalculator_Add_InputMessage__parameters = Add_element;

export type ICalculator_Add_OutputMessage__parameters = AddResponse_element;

export type ICalculator_Subtract_InputMessage__parameters = Subtract_element;

export type ICalculator_Subtract_OutputMessage__parameters = SubtractResponse_element;
