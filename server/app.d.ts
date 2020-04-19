import { UserModel } from 'cl-models';

export interface Identity {
  id: string;
  email: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      updateIdentity: (user: UserModel) => void;
      session: {
        isChanged: boolean;
        isNew: boolean;
        isPopulated: boolean;
        identity: Identity;
        // deeplink keys
        landing?: string;
        utmSource?: string;
        utmCampaign?: string;
        ref?: string;
        // timestamp, for session renew
        _ts_: number;
      };
    }
  }
}
