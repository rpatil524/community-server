import type { ALL_CREDENTIALS } from '../../authentication/CredentialTypes';

/**
 * A data interface indicating which permissions are required (based on the context).
 */
export interface Permissions {
  read?: boolean;
  append?: boolean;
  write?: boolean;
  create?: boolean;
  delete?: boolean;
}

export type PermissionSet = Partial<Record<ALL_CREDENTIALS, Permissions>>;

