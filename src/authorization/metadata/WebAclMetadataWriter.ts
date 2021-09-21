import type { AclPermissions } from '../../ldp/permissions/AclPermissions';
import { ACL, AUTH } from '../../util/Vocabularies';
import type { PermissionMetadataWriterInput } from './PermissionMetadataWriter';
import { PermissionMetadataWriter } from './PermissionMetadataWriter';

const validAclModes = new Set<keyof AclPermissions>([ 'read', 'write', 'append', 'control' ]);

/**
 * Indicates which permissions are available on the requested resource.
 */
export class WebAclMetadataWriter extends PermissionMetadataWriter {
  public async handle({ metadata, permissionSet }: PermissionMetadataWriterInput): Promise<void> {
    const user: AclPermissions = permissionSet.agent ?? {};
    const everyone: AclPermissions = permissionSet.everyone ?? {};
    for (const mode of (Object.keys(user) as (keyof AclPermissions)[])) {
      if (validAclModes.has(mode)) {
        const capitalizedMode = mode.charAt(0).toUpperCase() + mode.slice(1) as 'Read' | 'Write' | 'Append' | 'Control';
        if (user[mode]) {
          metadata.add(AUTH.terms.userMode, ACL.terms[capitalizedMode]);
        }
        if (everyone[mode]) {
          metadata.add(AUTH.terms.publicMode, ACL.terms[capitalizedMode]);
        }
      }
    }
  }
}
