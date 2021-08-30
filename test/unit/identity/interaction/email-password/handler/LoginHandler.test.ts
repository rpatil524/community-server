import type {
  InteractionHandlerInput,
} from '../../../../../../src/identity/interaction/email-password/handler/InteractionHandler';
import { LoginHandler } from '../../../../../../src/identity/interaction/email-password/handler/LoginHandler';
import type { AccountStore } from '../../../../../../src/identity/interaction/email-password/storage/AccountStore';
import { createPostFormOperation } from './Util';

describe('A LoginHandler', (): void => {
  const webId = 'http://alice.test.com/card#me';
  const email = 'alice@test.email';
  let input: InteractionHandlerInput;
  let accountStore: jest.Mocked<AccountStore>;
  let handler: LoginHandler;

  beforeEach(async(): Promise<void> => {
    input = {} as any;

    accountStore = {
      authenticate: jest.fn().mockResolvedValue(webId),
      getSettings: jest.fn().mockResolvedValue({ useIdp: true }),
    } as any;

    handler = new LoginHandler(accountStore);
  });

  it('errors on invalid emails.', async(): Promise<void> => {
    input.operation = createPostFormOperation({});
    let prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Email required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: {}}));
    input.operation = createPostFormOperation({ email: [ 'a', 'b' ]});
    prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Email required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { }}));
  });

  it('errors on invalid passwords.', async(): Promise<void> => {
    input.operation = createPostFormOperation({ email });
    let prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Password required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
    input.operation = createPostFormOperation({ email, password: [ 'a', 'b' ]});
    prom = handler.handle(input);
    await expect(prom).rejects.toThrow('Password required');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
  });

  it('throws an IdpInteractionError if there is a problem.', async(): Promise<void> => {
    input.operation = createPostFormOperation({ email, password: 'password!' });
    accountStore.authenticate.mockRejectedValueOnce(new Error('auth failed!'));
    const prom = handler.handle(input);
    await expect(prom).rejects.toThrow('auth failed!');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
  });

  it('throws an error if the account does not have the correct settings.', async(): Promise<void> => {
    input.operation = createPostFormOperation({ email, password: 'password!' });
    accountStore.getSettings.mockResolvedValueOnce({ useIdp: false });
    const prom = handler.handle(input);
    await expect(prom).rejects.toThrow('This account is not registered for identification');
    await expect(prom).rejects.toThrow(expect.objectContaining({ prefilled: { email }}));
  });

  it('returns an InteractionCompleteResult when done.', async(): Promise<void> => {
    input.operation = createPostFormOperation({ email, password: 'password!' });
    await expect(handler.handle(input)).resolves.toEqual({
      type: 'complete',
      details: { webId, shouldRemember: false },
    });
    expect(accountStore.authenticate).toHaveBeenCalledTimes(1);
    expect(accountStore.authenticate).toHaveBeenLastCalledWith(email, 'password!');
  });
});
