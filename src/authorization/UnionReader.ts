import type { ALL_CREDENTIALS } from '../authentication/CredentialTypes';
import type { Permissions, PermissionSet } from '../ldp/permissions/Permissions';
import { UnionHandler } from '../util/handlers/UnionHandler';
import type { PermissionReader } from './PermissionReader';

/**
 * Combines the results of multiple PermissionReaders.
 * Every permission in every credential type is handled according to the rule `false` \> `true` \> `undefined`.
 */
export class UnionReader extends UnionHandler<PermissionReader> {
  public constructor(readers: PermissionReader[]) {
    super(readers);
  }

  protected async combine(results: PermissionSet[]): Promise<PermissionSet> {
    const result: PermissionSet = {};
    for (const permissionSet of results) {
      for (const [ key, value ] of Object.entries(permissionSet) as [ ALL_CREDENTIALS, Permissions | undefined ][]) {
        result[key] = this.applyPermissions(value, result[key]);
      }
    }
    return result;
  }

  /**
   * Adds the given permissions to the result object according to the combination rules of the class.
   */
  private applyPermissions(permissions?: Permissions, result: Permissions = {}): Permissions {
    if (!permissions) {
      return result;
    }

    for (const [ key, value ] of Object.entries(permissions) as [ keyof Permissions, boolean | undefined ][]) {
      if (value === false) {
        result[key] = false;
      } else if (value === true && result[key] !== false) {
        result[key] = true;
      }
    }
    return result;
  }
}
