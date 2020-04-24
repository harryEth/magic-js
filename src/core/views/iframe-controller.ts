/* eslint-disable no-underscore-dangle */

import { MagicIncomingWindowMessage } from '../../types';
import { PayloadTransport } from '../payload-transport';
import { createDuplicateIframeWarning } from '../sdk-exceptions';
import { createURL } from '../../util/url';

/**
 * Magic `<iframe>` overlay styles. These base styles enable `<iframe>` UI
 * to render above all other DOM content.
 */
const overlayStyles: Partial<CSSStyleDeclaration> = {
  display: 'none',
  position: 'fixed',
  top: '0',
  right: '0',
  width: '100%',
  height: '100%',
  borderRadius: '0',
  border: 'none',
  zIndex: '2147483647',
};

/**
 * Apply iframe styles to the given element.
 * @param elem - An element to apply styles using CSSOM.
 */
function applyOverlayStyles(elem: HTMLElement) {
  for (const [cssProperty, value] of Object.entries(overlayStyles)) {
    /* eslint-disable-next-line no-param-reassign */
    elem.style[cssProperty as any] = value;
  }
}

/**
 * Checks if the given query params are associated with an active `<iframe>`
 * instance.
 *
 * @param encodedQueryParams - The unique, encoded query parameters to check for
 * duplicates against.
 */
function checkForSameSrcInstances(encodedQueryParams: string) {
  const iframes: HTMLIFrameElement[] = [].slice.call(document.querySelectorAll('.magic-iframe'));
  return Boolean(iframes.find(iframe => iframe.src.includes(encodedQueryParams)));
}

/**
 * View controller for the Magic `<iframe>` overlay.
 */
export class IframeController {
  public iframe: Promise<HTMLIFrameElement>;
  public ready: Promise<void>;

  constructor(
    private readonly transport: PayloadTransport,
    private readonly endpoint: string,
    private readonly encodedQueryParams: string,
  ) {
    this.iframe = this.init();
    this.ready = this.waitForReady();
    this.listen();
  }

  /**
   * Initialize the Magic `<iframe>` and pre-load overlay content when the DOM
   * is ready.
   */
  private init(): Promise<HTMLIFrameElement> {
    return new Promise(resolve => {
      const onload = () => {
        if (!checkForSameSrcInstances(encodeURIComponent(this.encodedQueryParams))) {
          const iframe = document.createElement('iframe');
          iframe.classList.add('magic-iframe');
          iframe.dataset.magicIframeLabel = createURL(this.endpoint).host;
          iframe.src = createURL(`/send?params=${encodeURIComponent(this.encodedQueryParams)}`, this.endpoint).href;
          applyOverlayStyles(iframe);
          document.body.appendChild(iframe);
          resolve(iframe);
        } else {
          createDuplicateIframeWarning().log();
        }
      };

      // Check DOM state and load...
      if (['loaded', 'interactive', 'complete'].includes(document.readyState)) {
        onload();
      } else {
        // ...or check load events to load
        window.addEventListener('load', onload, false);
      }
    });
  }

  /**
   * Show the Magic `<iframe>` overlay.
   */
  private async showOverlay() {
    const overlayResolved = await this.iframe;
    overlayResolved.style.display = 'block';
  }

  /**
   * Hide the Magic `<iframe>` overlay.
   */
  private async hideOverlay() {
    const overlayResolved = await this.iframe;
    overlayResolved.style.display = 'none';
  }

  /**
   * Set the controller as "ready" for JSON RPC events.
   */
  private waitForReady() {
    return new Promise<void>(resolve => {
      this.transport.on(MagicIncomingWindowMessage.MAGIC_OVERLAY_READY, () => resolve());
    });
  }

  /**
   * Listen for messages sent from the underlying Magic `<iframe>`.
   */
  private listen() {
    this.transport.on(MagicIncomingWindowMessage.MAGIC_HIDE_OVERLAY, () => {
      this.hideOverlay();
    });

    this.transport.on(MagicIncomingWindowMessage.MAGIC_SHOW_OVERLAY, () => {
      this.showOverlay();
    });
  }
}
