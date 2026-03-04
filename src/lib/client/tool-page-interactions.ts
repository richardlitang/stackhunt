export interface OutboundTrackingPayload {
  type: string;
  location: string;
  tool: string;
  href: string;
}

type PlausibleFn = (event: string, options: { props: OutboundTrackingPayload }) => void;

function getPlausible(): PlausibleFn | null {
  const maybePlausible = (window as unknown as { plausible?: PlausibleFn }).plausible;
  return typeof maybePlausible === 'function' ? maybePlausible : null;
}

function isEnabledFocusableElement(value: Element): value is HTMLElement {
  return value instanceof HTMLElement && !value.hasAttribute('disabled');
}

export function sanitizeOutboundHref(href: string): string {
  try {
    const parsed = new URL(href);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return href.split('?')[0];
  }
}

export function deriveOutboundType(link: HTMLAnchorElement): string {
  return (
    link.dataset.outbound || (link.textContent?.trim().toLowerCase() === 'source' ? 'source' : 'vendor')
  );
}

function trackOutboundClick(link: HTMLAnchorElement): void {
  const href = link.getAttribute('href') || '';
  const isExternal = /^https?:\/\//i.test(href);
  if (!isExternal) return;

  const payload: OutboundTrackingPayload = {
    type: deriveOutboundType(link),
    location: link.dataset.location || 'unknown',
    tool: link.dataset.tool || '',
    href: sanitizeOutboundHref(href),
  };

  const plausible = getPlausible();
  if (plausible) plausible('outbound_click', { props: payload });
}

export function initToolPageInteractions(root: ParentNode = document): void {
  const pageRoot = root.querySelector('main') || document.body;

  let isSuggestEditReady = false;
  let openSuggestEdit: (() => void) | null = null;
  let closeSuggestEdit: (() => void) | null = null;

  const initSuggestEditModal = (): void => {
    if (isSuggestEditReady) return;
    const modal = document.getElementById('suggest-edit-modal');
    const modalPanel = modal?.querySelector('[data-modal-panel]');
    const form = document.getElementById('suggest-edit-form') as HTMLFormElement | null;
    const success = document.getElementById('suggest-edit-success');
    if (!modal || !modalPanel || !form || !success) return;

    let lastFocusedElement: HTMLElement | null = null;

    const focusFirstFocusable = (): void => {
      const firstFocusable = modal.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable instanceof HTMLElement) firstFocusable.focus();
    };

    const closeModal = (): void => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.setAttribute('aria-hidden', 'true');
      lastFocusedElement?.focus();
    };

    const openModal = (): void => {
      lastFocusedElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      modal.setAttribute('aria-hidden', 'false');
      form.classList.remove('hidden');
      success.classList.add('hidden');
      setTimeout(() => focusFirstFocusable(), 0);
    };

    const trapFocus = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab' || modal.classList.contains('hidden')) return;
      const focusable = Array.from(
        modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(isEnabledFocusableElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
      trapFocus(event);
    });

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
    modalPanel.addEventListener('click', (event) => event.stopPropagation());
    modal.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => closeModal());
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      try {
        const res = await fetch('/api/corrections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          form.classList.add('hidden');
          success.classList.remove('hidden');
          form.reset();
        } else {
          alert('Failed to submit. Please try again.');
        }
      } catch {
        alert('Network error. Please try again.');
      }
    });

    openSuggestEdit = openModal;
    closeSuggestEdit = closeModal;
    isSuggestEditReady = true;
  };

  pageRoot.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const link = target.closest('a');
    if (link instanceof HTMLAnchorElement) trackOutboundClick(link);

    const openSuggestEditButton = target.closest('[data-suggest-edit]');
    if (openSuggestEditButton) {
      initSuggestEditModal();
      openSuggestEdit?.();
      return;
    }

    const closeSuggestEditButton = target.closest('[data-close-modal]');
    if (closeSuggestEditButton) {
      closeSuggestEdit?.();
    }
  });
}
