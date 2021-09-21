import type { Permissions } from './Permissions';

// Adds a control field to the permissions to specify this WAC-specific value
export interface AclPermissions extends Permissions {
  control?: boolean;
}
