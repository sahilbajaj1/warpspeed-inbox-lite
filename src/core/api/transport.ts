export type HttpTransport = {
  request: (input: string, init: RequestInit) => Promise<Response>;
};

/** Default transport — injectable for tests. */
export const fetchTransport: HttpTransport = {
  request(input, init) {
    return fetch(input, init);
  },
};
