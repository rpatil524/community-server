import 'jest-rdf';
import { AGENT, EVERYONE } from '../../../../src/authentication/CredentialTypes';
import { WebAclMetadataWriter } from '../../../../src/authorization/metadata/WebAclMetadataWriter';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { ACL, AUTH } from '../../../../src/util/Vocabularies';

describe('A WebAclMetadataWriter', (): void => {
  const writer = new WebAclMetadataWriter();

  it('adds no metadata if there are no permissions.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata();
    await expect(writer.handle({ metadata, permissionSet: {}})).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(0);
  });

  it('adds corresponding acl metadata for all permissions present.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata();
    const permissionSet = {
      [AGENT]: { read: true, write: true, control: false },
      [EVERYONE]: { read: true, write: false },
    };
    await expect(writer.handle({ metadata, permissionSet })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(3);
    expect(metadata.getAll(AUTH.terms.userMode)).toEqualRdfTermArray([ ACL.terms.Read, ACL.terms.Write ]);
    expect(metadata.get(AUTH.terms.publicMode)).toEqualRdfTerm(ACL.terms.Read);
  });

  it('ignores unknown modes.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata();
    const permissionSet = {
      [AGENT]: { read: true, create: true },
      [EVERYONE]: { read: true },
    };
    await expect(writer.handle({ metadata, permissionSet })).resolves.toBeUndefined();
    expect(metadata.quads()).toHaveLength(2);
    expect(metadata.getAll(AUTH.terms.userMode)).toEqualRdfTermArray([ ACL.terms.Read ]);
    expect(metadata.get(AUTH.terms.publicMode)).toEqualRdfTerm(ACL.terms.Read);
  });
});
