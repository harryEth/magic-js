/* eslint-disable no-underscore-dangle, no-param-reassign */

import { JsonRpcRequestPayload, JsonRpcResponsePayload, JsonRpcError } from '../types';
import { isJsonRpcResponsePayload } from '../util/type-guards';
import { getPayloadId } from '../util/get-payload-id';

/**
 * Returns a full `JsonRpcRequestPayload` from a potentially incomplete payload
 * object. This method mutates the given `payload` to preserve compatibility
 * with external libraries that perform their own `JsonRpcRequestPayload.id`
 * check to associate responses (such as `web3`).
 */
export function standardizeJsonRpcRequestPayload(payload: Partial<JsonRpcRequestPayload>) {
  payload.jsonrpc = payload.jsonrpc ?? '2.0';
  payload.id = getPayloadId();
  payload.method = payload.method ?? 'noop';
  payload.params = payload.params ?? [];
  return payload as JsonRpcRequestPayload;
}

/**
 * Build a valid JSON RPC payload for emitting to the Magic SDK iframe relayer.
 */
export function createJsonRpcRequestPayload(method: string, params: any[] = []): JsonRpcRequestPayload {
  return {
    params,
    method,
    jsonrpc: '2.0',
    id: getPayloadId(),
  };
}

/**
 * Formats and standardizes a JSON RPC 2.0 response from a number of potential
 * sources.
 */
export class JsonRpcResponse<ResultType = any> {
  private readonly _jsonrpc: string;
  private readonly _id: string | number | null;
  private _result?: ResultType | null;
  private _error?: JsonRpcError | null;

  constructor(responsePayload: JsonRpcResponsePayload);
  constructor(response: JsonRpcResponse<ResultType>);
  constructor(requestPayload: JsonRpcRequestPayload);
  constructor(responseOrPayload: JsonRpcResponsePayload | JsonRpcResponse<ResultType> | JsonRpcRequestPayload) {
    if (responseOrPayload instanceof JsonRpcResponse) {
      this._jsonrpc = responseOrPayload.payload.jsonrpc;
      this._id = responseOrPayload.payload.id;
      this._result = responseOrPayload.payload.result;
      this._error = responseOrPayload.payload.error;
    } else if (isJsonRpcResponsePayload(responseOrPayload)) {
      this._jsonrpc = responseOrPayload.jsonrpc;
      this._id = responseOrPayload.id;
      this._result = responseOrPayload.result;
      this._error = responseOrPayload.error;
    } else {
      this._jsonrpc = responseOrPayload.jsonrpc;
      this._id = responseOrPayload.id;
      this._result = null;
      this._error = null;
    }
  }

  public applyError(error?: JsonRpcError | null) {
    this._error = error;
    return this;
  }

  public applyResult(result?: ResultType | null) {
    this._result = result;
    return this;
  }

  public get hasError() {
    return typeof this._error !== 'undefined' && this._error !== null;
  }

  public get hasResult() {
    return typeof this._result !== 'undefined' && this._result !== null;
  }

  public get payload(): JsonRpcResponsePayload {
    return {
      jsonrpc: this._jsonrpc,
      id: this._id,
      result: this._result,
      error: this._error,
    };
  }
}
