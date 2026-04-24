import { ApiRoutePath } from '../../../../shared/enums/routes.enums';
import { ServerRoutePath } from '../../../../shared/enums/server.enums';
import { ClearCookieOptions, TokenCookie } from '../../../src/utils/auth/cookieConfig';

describe('cookieConfig', () => {
    it('scopes the refresh cookie to the shared auth route prefix', () => {
        expect(TokenCookie.options.path).toBe(ServerRoutePath.AUTH);
        expect(ClearCookieOptions.path).toBe(ServerRoutePath.AUTH);
        expect(ApiRoutePath.AUTH_REFRESH.startsWith(`${ServerRoutePath.AUTH}/`)).toBe(true);
        expect(ApiRoutePath.AUTH_LOGOUT.startsWith(`${ServerRoutePath.AUTH}/`)).toBe(true);
    });
});
