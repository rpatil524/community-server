/* eslint-disable @typescript-eslint/naming-convention */
// These are the specific types of credentials that can be extracted
export const AGENT = 'agent';
export const EVERYONE = 'everyone';

export type ALL_CREDENTIALS = typeof AGENT | typeof EVERYONE;
