import 'express-serve-static-core';
import { Locale } from '../../../shared/i18n/types/locale';
import { Profile } from '../../../shared/enums/user.enums';

declare module 'express-serve-static-core' {
    interface Request {
        language?: Locale;
        user?: {
            id: number;
            profile?: Profile;
        };
        file?: Express.Multer.File;
        files?: Express.Multer.File[];
    }
}

export { };
