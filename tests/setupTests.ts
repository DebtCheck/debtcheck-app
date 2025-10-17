import 'whatwg-fetch';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import "@testing-library/jest-dom";

// App Router basics for client components
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(), replace: vi.fn(), refresh: vi.fn(),
    back: vi.fn(), forward: vi.fn(), prefetch: vi.fn(),
  }),
  usePathname: () => '/__test__',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// If something hits next/headers or cookies in JSDOM, keep it harmless
vi.mock('next/headers', () => ({
  headers: () => new Headers(),
  cookies: () => ({
    get: vi.fn(), set: vi.fn(), delete: vi.fn(), getAll: vi.fn(() => []),
  }),
}));