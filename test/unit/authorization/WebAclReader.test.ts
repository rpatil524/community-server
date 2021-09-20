import { namedNode, quad } from '@rdfjs/data-model';
import type { CredentialSet } from '../../../src/authentication/Credentials';
import { AGENT, EVERYONE } from '../../../src/authentication/CredentialTypes';
import type { AccessChecker } from '../../../src/authorization/access-checkers/AccessChecker';
import { WebAclReader } from '../../../src/authorization/WebAclReader';
import type { AuxiliaryIdentifierStrategy } from '../../../src/ldp/auxiliary/AuxiliaryIdentifierStrategy';
import { BasicRepresentation } from '../../../src/ldp/representation/BasicRepresentation';
import type { Representation } from '../../../src/ldp/representation/Representation';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import { INTERNAL_QUADS } from '../../../src/util/ContentTypes';
import { ForbiddenHttpError } from '../../../src/util/errors/ForbiddenHttpError';
import { InternalServerError } from '../../../src/util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../src/util/errors/NotFoundHttpError';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';
import { SingleRootIdentifierStrategy } from '../../../src/util/identifiers/SingleRootIdentifierStrategy';
import { guardedStreamFrom } from '../../../src/util/StreamUtil';

const nn = namedNode;

const acl = 'http://www.w3.org/ns/auth/acl#';
const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

describe('A WebAclReader', (): void => {
  let reader: WebAclReader;
  const aclStrategy: AuxiliaryIdentifierStrategy = {
    getAuxiliaryIdentifier: (id: ResourceIdentifier): ResourceIdentifier => ({ path: `${id.path}.acl` }),
    isAuxiliaryIdentifier: (id: ResourceIdentifier): boolean => id.path.endsWith('.acl'),
    getAssociatedIdentifier: (id: ResourceIdentifier): ResourceIdentifier => ({ path: id.path.slice(0, -4) }),
  } as any;
  let store: jest.Mocked<ResourceStore>;
  const identifierStrategy = new SingleRootIdentifierStrategy('http://test.com/');
  let credentials: CredentialSet;
  let identifier: ResourceIdentifier;
  let accessChecker: jest.Mocked<AccessChecker>;

  beforeEach(async(): Promise<void> => {
    credentials = { [EVERYONE]: {}, [AGENT]: {}};
    identifier = { path: 'http://test.com/foo' };

    store = {
      getRepresentation: jest.fn().mockResolvedValue(new BasicRepresentation([
        quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      ], INTERNAL_QUADS)),
    } as any;

    accessChecker = {
      handleSafe: jest.fn().mockResolvedValue(true),
    } as any;

    reader = new WebAclReader(aclStrategy, store, identifierStrategy, accessChecker);
  });

  it('handles all non-acl inputs.', async(): Promise<void> => {
    await expect(reader.canHandle({ identifier, credentials })).resolves.toBeUndefined();
    await expect(reader.canHandle({ identifier: aclStrategy.getAuxiliaryIdentifier(identifier) } as any))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('only handles AGENT and EVERYONE credentials.', async(): Promise<void> => {
    (credentials as any).apple = {};
    await expect(reader.canHandle({ identifier, credentials }))
      .rejects.toThrow(NotImplementedHttpError);
  });

  it('returns undefined permissions for undefined credentials.', async(): Promise<void> => {
    credentials = {};
    await expect(reader.handle({ identifier, credentials })).resolves.toEqual({
      [EVERYONE]: {},
      [AGENT]: {},
    });
  });

  it('reads the accessTo value of the acl resource.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ]) } as Representation);
    await expect(reader.handle({ identifier, credentials })).resolves.toEqual({
      [EVERYONE]: { read: true },
      [AGENT]: { read: true },
    });
  });

  it('ignores accessTo fields pointing to different resources.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn('somewhereElse')),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
    ]) } as Representation);
    await expect(reader.handle({ identifier, credentials })).resolves.toEqual({
      [EVERYONE]: {},
      [AGENT]: {},
    });
  });

  it('handles all valid modes and ignores other ones.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}fakeMode1`)),
    ]) } as Representation);
    await expect(reader.handle({ identifier, credentials })).resolves.toEqual({
      [EVERYONE]: { read: true },
      [AGENT]: { read: true },
    });
  });

  it('reads the default value of a parent if there is no direct acl resource.', async(): Promise<void> => {
    store.getRepresentation.mockImplementation(async(id: ResourceIdentifier): Promise<Representation> => {
      if (id.path.endsWith('foo.acl')) {
        throw new NotFoundHttpError();
      }
      return new BasicRepresentation([
        quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
        quad(nn('auth'), nn(`${acl}agentClass`), nn('http://xmlns.com/foaf/0.1/Agent')),
        quad(nn('auth'), nn(`${acl}default`), nn(identifierStrategy.getParentContainer(identifier).path)),
        quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Read`)),
      ], INTERNAL_QUADS);
    });
    await expect(reader.handle({ identifier, credentials })).resolves.toEqual({
      [EVERYONE]: { read: true },
      [AGENT]: { read: true },
    });
  });

  it('re-throws ResourceStore errors as internal errors.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValue(new Error('TEST!'));
    const promise = reader.handle({ identifier, credentials });
    await expect(promise).rejects.toThrow(`Error reading ACL for ${identifier.path}: TEST!`);
    await expect(promise).rejects.toThrow(InternalServerError);
  });

  it('errors if the root container has no corresponding acl document.', async(): Promise<void> => {
    store.getRepresentation.mockRejectedValue(new NotFoundHttpError());
    const promise = reader.handle({ identifier, credentials });
    await expect(promise).rejects.toThrow('No ACL document found for root container');
    await expect(promise).rejects.toThrow(ForbiddenHttpError);
  });

  it('allows an agent to append if they have write access.', async(): Promise<void> => {
    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth'), nn(`${acl}mode`), nn(`${acl}Write`)),
    ]) } as Representation);
    await expect(reader.handle({ identifier, credentials })).resolves.toEqual({
      [EVERYONE]: { write: true, append: true },
      [AGENT]: { write: true, append: true },
    });
  });

  it('assigns public permissions to the agent permissions.', async(): Promise<void> => {
    credentials.agent = { webId: 'http://test.com/user' };
    // EVERYONE gets true on auth1, AGENT on auth2
    accessChecker.handleSafe.mockImplementation(async({ rule, credentials: cred }): Promise<boolean> =>
      (rule.value === 'auth1') === !cred.webId);

    store.getRepresentation.mockResolvedValue({ data: guardedStreamFrom([
      quad(nn('auth1'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth1'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth1'), nn(`${acl}mode`), nn(`${acl}Read`)),
      quad(nn('auth2'), nn(`${rdf}type`), nn(`${acl}Authorization`)),
      quad(nn('auth2'), nn(`${acl}accessTo`), nn(identifier.path)),
      quad(nn('auth2'), nn(`${acl}mode`), nn(`${acl}Control`)),
    ]) } as Representation);

    await expect(reader.handle({ identifier, credentials })).resolves.toEqual({
      [EVERYONE]: { read: true },
      [AGENT]: { read: true, control: true },
    });
  });
});
