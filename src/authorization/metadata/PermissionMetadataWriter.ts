import type { PermissionSet } from '../../ldp/permissions/Permissions';
import type { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

export interface PermissionMetadataWriterInput {
  /**
   * Metadata to update with permission knowledge.
   */
  metadata: RepresentationMetadata;
  /**
   * Permissions granted for this request.
   */
  permissionSet: PermissionSet;
}

/**
 * Adds metadata about the granted permissions to the provided metadata object.
 */
export abstract class PermissionMetadataWriter extends AsyncHandler<PermissionMetadataWriterInput> {}
