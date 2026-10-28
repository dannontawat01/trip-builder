'use client';

import { useEffect, useRef } from 'react';
import { getWrappedFocusTarget } from '@/lib/dialogFocus';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleControls(dialog) {
  return Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(element => element.getClientRects().length > 0);
}

function handleTab(event, dialog) {
  const controls = visibleControls(dialog);
  const target = getWrappedFocusTarget(controls, document.activeElement, event.shiftKey);
  if (target || controls.length === 0) {
    event.preventDefault();
    (target || dialog).focus();
  }
}

export default function useDialogFocus(isOpen, onClose) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const previousFocus = document.activeElement;
    const initialFocus = dialog.querySelector('[data-dialog-initial-focus]') || visibleControls(dialog)[0] || dialog;
    initialFocus.focus();

    const onKeyDown = event => {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      } else if (event.key === 'Tab') {
        handleTab(event, dialog);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  return dialogRef;
}
