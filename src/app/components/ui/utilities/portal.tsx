'use client';
import {createPortal} from 'react-dom';
import {useEffect, useState, useLayoutEffect} from 'react';

export function Portal({children}: {children: React.ReactNode}) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}