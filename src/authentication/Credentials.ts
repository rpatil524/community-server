import type { ALL_CREDENTIALS } from './CredentialTypes';

/**
 * Credentials identifying an entity accessing or owning data.
 */
export interface Credentials {
  webId?: string;
}

/**
 * A combination of multiple credentials, where their type is specified by the key.
 */
export type CredentialSet = Partial<Record<ALL_CREDENTIALS, Credentials>>;

