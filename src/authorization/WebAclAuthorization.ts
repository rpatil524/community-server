import type { Permissions } from '../ldp/permissions/Permissions';
import type { RepresentationMetadata } from '../ldp/representation/RepresentationMetadata';
import { ACL, AUTH } from '../util/Vocabularies';
import type { Authorization } from './Authorization';

/**
 * Indicates which permissions are available on the requested resource.
 */
export class WebAclAuthorization implements Authorization {
  /**
   * Permissions granted to the agent requesting the resource.
   */
  public user: Permissions;
  /**
   * Permissions granted to the public.
   */
  public everyone: Permissions;

  public constructor(user: Permissions, everyone: Permissions) {
    this.user = user;
    this.everyone = everyone;
  }

  public addMetadata(metadata: RepresentationMetadata): void {
    for (const mode of (Object.keys(this.user) as (keyof Permissions)[])) {
      const capitalizedMode = mode.charAt(0).toUpperCase() + mode.slice(1) as 'Read' | 'Write' | 'Append' | 'Control';
      if (this.user[mode]) {
        metadata.add(AUTH.terms.userMode, ACL.terms[capitalizedMode]);
      }
      if (this.everyone[mode]) {
        metadata.add(AUTH.terms.publicMode, ACL.terms[capitalizedMode]);
      }
    }
  }
}
