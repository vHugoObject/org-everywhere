import { localStorageAvailable } from '../util/settings_persister';

export default () => {
  if (!localStorageAvailable) {
    return;
  }

  Object.entries(localStorage).forEach(([k, v], _) => {
    if (['null', 'undefined'].includes(v)) {
      console.warn(`localStorage contains a bogus entry: '${k}': '${v}'`);
      console.warn('Deleting the bogus entry.');
      localStorage.removeItem(k);
    }
  });
};
