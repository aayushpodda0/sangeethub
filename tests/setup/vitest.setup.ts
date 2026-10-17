import "@testing-library/jest-dom/vitest";


// Vitest runs without `globals`, so Testing Library's automatic cleanup never registers.
// Unmount rendered components after every test so they can't leak into the next one.
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
