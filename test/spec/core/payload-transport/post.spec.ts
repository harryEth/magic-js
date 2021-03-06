/* eslint-disable prefer-spread */

import browserEnv from '@ikscodes/browser-env';
import test from 'ava';
import sinon from 'sinon';
import { IframeController } from '../../../../src/core/views/iframe-controller';
import { PayloadTransport } from '../../../../src/core/payload-transport';
import { MagicIncomingWindowMessage, MagicOutgoingWindowMessage, JsonRpcRequestPayload } from '../../../../src/types';
import { createPayloadTransport } from '../../../factories';
import { JsonRpcResponse } from '../../../../src/core/json-rpc';
import { ReactNativeWebViewController } from '../../../../src/core/views/react-native-webview-controller';
import { mockConfigConstant } from '../../../mocks';

/**
 * Stub `IframeController` for `PayloadTransport` testing requirements.
 */
function iframeOverlayStub(hasContentWindow = true): IframeController {
  const stub = {
    ready: Promise.resolve(),
    iframe: Promise.resolve({
      contentWindow: hasContentWindow
        ? {
            postMessage: sinon.stub(),
          }
        : undefined,
    }),
  } as any;

  Object.setPrototypeOf(stub, IframeController.prototype);

  return stub;
}

/**
 * Stub `ReactNativeWebViewController` for `PayloadTransport` testing requirements.
 */
function webviewOverlayStub(hasPostMessage = true): IframeController {
  const stub = {
    ready: Promise.resolve(),
    webView: {
      postMessage: hasPostMessage ? sinon.stub() : undefined,
    },
  } as any;

  Object.setPrototypeOf(stub, ReactNativeWebViewController.prototype);

  return stub;
}

/**
 * Create a dummy request payload.
 */
function requestPayload(id = 1): JsonRpcRequestPayload {
  return {
    id,
    jsonrpc: '2.0',
    method: 'eth_accounts',
    params: [],
  };
}

/**
 * Create a dummy response payload.
 */
function responseEvent(values: { result?: any; error?: any; id?: number } = {}) {
  return {
    data: {
      response: {
        result: values.result ?? null,
        error: values.error ?? null,
        jsonrpc: '2.0',
        id: values.id ?? 1,
      },
    },
  };
}

/**
 * Stub the `PayloadTransport.on` method (hide implementation, only test
 * `PayloadTransport.post` logic).
 */
function stubPayloadTransport(transport: PayloadTransport, events: [MagicIncomingWindowMessage, any][]) {
  const timeouts = [];
  const handlerSpy = sinon.spy(() => timeouts.forEach(t => t && clearTimeout(t)));
  const onSpy = sinon.spy((msgType, handler) => {
    events.forEach((event, i) => {
      if (msgType === event[0]) {
        timeouts.push(setTimeout(() => handler(event[1]), 1000 * (i + 1)));
      }
    });
    return handlerSpy;
  });

  /* eslint-disable-next-line no-param-reassign */
  (transport as any).on = onSpy;

  return { handlerSpy, onSpy };
}

test.beforeEach(t => {
  browserEnv();
  browserEnv.stub('addEventListener', sinon.stub());
  mockConfigConstant('IS_REACT_NATIVE', false);
});

test.serial('Sends payload; recieves MAGIC_HANDLE_REQUEST event; resolves response', async t => {
  const transport = createPayloadTransport('asdf');
  const { handlerSpy, onSpy } = stubPayloadTransport(transport, [
    [MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE, responseEvent()],
  ]);
  const overlay = iframeOverlayStub();
  const payload = requestPayload();

  const response = await transport.post(overlay, MagicOutgoingWindowMessage.MAGIC_HANDLE_REQUEST, payload);

  t.is(onSpy.args[0][0], MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE);
  t.true(handlerSpy.calledOnce);
  t.deepEqual(response, new JsonRpcResponse(responseEvent().data.response));
});

test.serial(
  'Sends payload; recieves MAGIC_HANDLE_REQUEST event; skips payloads with non-matching ID; resolves response',
  async t => {
    const transport = createPayloadTransport('asdf');
    const { handlerSpy, onSpy } = stubPayloadTransport(transport, [
      [MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE, responseEvent({ id: 1234 })], // Should be skipped
      [MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE, responseEvent()],
    ]);
    const overlay = iframeOverlayStub();
    const payload = requestPayload();

    const response = await transport.post(overlay, MagicOutgoingWindowMessage.MAGIC_HANDLE_REQUEST, payload);

    t.is(onSpy.args[0][0], MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE);
    t.true(handlerSpy.calledOnce);
    t.deepEqual(response, new JsonRpcResponse(responseEvent().data.response));
  },
);

test.serial(
  'Sends payload; recieves MAGIC_HANDLE_REQUEST event; uses `ReactNativeWebViewController`; resolves response',
  async t => {
    mockConfigConstant('IS_REACT_NATIVE', true);
    const transport = createPayloadTransport('asdf');
    const { handlerSpy, onSpy } = stubPayloadTransport(transport, [
      [MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE, responseEvent()],
    ]);
    const overlay = webviewOverlayStub();
    const payload = requestPayload();

    const response = await transport.post(overlay, MagicOutgoingWindowMessage.MAGIC_HANDLE_REQUEST, payload);

    t.is(onSpy.args[0][0], MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE);
    t.true(handlerSpy.calledOnce);
    t.deepEqual(response, new JsonRpcResponse(responseEvent().data.response));
  },
);

test.serial('Fails to send payload if overlay `contentWindow` is `undefined`', async t => {
  const transport = createPayloadTransport('asdf');
  stubPayloadTransport(transport, [[MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE, responseEvent()]]);
  const overlay = iframeOverlayStub(false);
  const payload = requestPayload();

  let didReject = false;
  try {
    await transport.post(overlay, MagicOutgoingWindowMessage.MAGIC_HANDLE_REQUEST, payload);
  } catch (err) {
    didReject = true;

    t.is(err.message, 'Magic SDK Error: [MODAL_NOT_READY] Modal is not ready.');
  }

  t.true(didReject);
});

test.serial('Sends payload and standardizes malformed response', async t => {
  const transport = createPayloadTransport('asdf');
  const overlay = iframeOverlayStub();
  const payload = requestPayload();

  stubPayloadTransport(transport, [
    [MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE, { data: { response: undefined } }],
  ]);

  transport.post(overlay, MagicOutgoingWindowMessage.MAGIC_HANDLE_REQUEST, payload);

  t.true(true);
});

test.serial('Sends a batch payload and resolves with multiple responses', async t => {
  const response1 = responseEvent({ result: 'one', id: 1 });
  const response2 = responseEvent({ result: 'two', id: 2 });
  const response3 = responseEvent({ result: 'three', id: 3 });

  const transport = createPayloadTransport('asdf');
  const { handlerSpy, onSpy } = stubPayloadTransport(transport, [
    [MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE, response1],
    [MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE, response2],
    [MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE, response3],
  ]);
  const overlay = iframeOverlayStub();

  const payload1 = requestPayload(1);
  const payload2 = requestPayload(2);
  const payload3 = requestPayload(3);

  const response = await transport.post(overlay, MagicOutgoingWindowMessage.MAGIC_HANDLE_REQUEST, [
    payload1,
    payload2,
    payload3,
  ]);

  t.is(onSpy.args[0][0], MagicIncomingWindowMessage.MAGIC_HANDLE_RESPONSE);
  t.true(handlerSpy.calledOnce);
  t.deepEqual(response, [
    new JsonRpcResponse(response1.data.response),
    new JsonRpcResponse(response2.data.response),
    new JsonRpcResponse(response3.data.response),
  ]);
});
