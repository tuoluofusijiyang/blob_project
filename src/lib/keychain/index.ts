import keytar from 'keytar';

const SERVICE = 'content-tools';

export async function setKey(account: string, key: string): Promise<void> {
  await keytar.setPassword(SERVICE, account, key);
}

export async function getKey(account: string): Promise<string | null> {
  return keytar.getPassword(SERVICE, account);
}

export async function deleteKey(account: string): Promise<boolean> {
  return keytar.deletePassword(SERVICE, account);
}