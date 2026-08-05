import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock next/navigation router actions
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      prefetch: () => null,
      push: () => null,
      replace: () => null,
    };
  },
  usePathname() {
    return "/";
  },
  useParams() {
    return {};
  },
}));

// Mock localStorage fallback
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});
