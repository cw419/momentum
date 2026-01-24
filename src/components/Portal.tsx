import React from 'react';
import { createPortal } from 'react-dom';

export function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined' || !document.body) return null;
  return createPortal(children, document.body);
}

