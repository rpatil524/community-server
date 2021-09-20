import type { Permissions } from '../../ldp/permissions/Permissions';
import { ACL, AUTH } from '../../util/Vocabularies';
import type { PermissionMetadataWriterInput } from './PermissionMetadataWriter';
import { PermissionMetadataWriter } from './PermissionMetadataWriter';

/**
 * Indicates which permissions are available on the requested resource.
 */
export class WebAclMetadataWriter extends PermissionMetadataWriter {
  public async handle({ metadata, permissionSet }: PermissionMetadataWriterInput): Promise<void> {
    const user = permissionSet.agent ?? {};
    const everyone = permissionSet.everyone ?? {};
    for (const mode of (Object.keys(user) as (keyof Permissions)[])) {
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
