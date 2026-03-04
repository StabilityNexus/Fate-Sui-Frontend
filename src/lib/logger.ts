const isDev = process.env.NODE_ENV === "development";

export const log = (...args: any[]): void => {
  if (isDev) console.log(...args);
};

export const warn = (...args: any[]): void => {
  if (isDev) console.warn(...args);
};

export const error = (...args: any[]): void => {
  console.error(...args); // always surfaces
};

const logger = { log, warn, error };
export default logger;
