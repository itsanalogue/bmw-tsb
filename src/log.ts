/* eslint-disable no-console */
export default {
  info: (message: string) => console.info(message),
  warn: (message: string) => console.warn(message),
  error: (message: string, ...params: unknown[]) =>
    console.error(message, ...params),
};
