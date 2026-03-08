/* Dev-only logger utility. */

import { isDev } from "@/config/env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const log = (...args: any[]): void => {
  if (isDev) console.log(...args);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const warn = (...args: any[]): void => {
  if (isDev) console.warn(...args);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const error = (...args: any[]): void => {
  console.error(...args);
};

const logger = { log, warn, error };
export default logger;