import bcrypt from 'bcrypt';
import path from 'path';
import { Readable } from 'stream';
import { Client as FtpClient } from 'basic-ftp';
import { FilterOperator, SortOrder } from '../../../shared/enums/operator.enums';
import { UserRepository } from '../repositories/userRepository';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { SelectUser, InsertUser } from '../db/schema';
import { QueryOptions } from '../utils/pagination';
import { TokenService } from './tokenService';
import { sendEmailVerificationEmail } from '../utils/email/authEmail';
import { PNG_MIME_TYPES, UploadFileExtension } from '../../../shared/enums/upload.enums';
import type { CreateUserInput, SanitizedUser, UpdateUserInput, UserEntity } from '../../../shared/domains/user/user.types';

const USER_SERVICE_CONFIG = {
    avatarPublicBaseUrl: process.env.AVATAR_PUBLIC_BASE_URL ?? 'https://zinero.bade.digital/zinero/users',
    avatarDirectory: 'avatar',
    avatarFileBase: 'avatar',
    avatarBackupBase: 'avatar_old',
    passwordHashRounds: 10,
    defaultFtpPort: 21,
} as const;

/**
 * @summary Resolves avatar file extension based on the uploaded MIME type.
 */
const resolveAvatarExtension = (mimeType: string) => {
    if (PNG_MIME_TYPES.has(mimeType)) {
        return UploadFileExtension.PNG;
    }
    return UploadFileExtension.JPG;
};

/**
 * Service for user business logic.
 * Handles user operations including authentication and data sanitization.
 */
export class UserService {
    private userRepository: UserRepository;
    private tokenService: TokenService;

    constructor() {
        this.userRepository = new UserRepository();
        this.tokenService = new TokenService();
    }

        /**
     * @summary Converts nullable Date values to nullable ISO-8601 strings.
     */
    private toIsoString(value: Date | null): string | null {
        if (!value) {
            return null;
        }
        return value.toISOString();
    }

        /**
     * @summary Maps user rows to API entities with normalized date fields.
     */
    private toUserEntity(data: SelectUser): UserEntity {
        return {
            ...data,
            birthDate: this.toIsoString(data.birthDate),
            emailVerifiedAt: this.toIsoString(data.emailVerifiedAt),
            createdAt: data.createdAt.toISOString(),
            updatedAt: data.updatedAt.toISOString(),
        };
    }

        /**
     * @summary Removes sensitive fields from user entities before returning responses.
     */
    private sanitizeUser(data: SelectUser): SanitizedUser {
        const { password, ...safeUser } = this.toUserEntity(data);
        void password;
        return safeUser;
    }

    /**
     * Creates a new user with a unique email and hashed password.
     * Validates that the email is not already registered.
     *
     * @summary Creates a new user account with email validation.
     * @param data - User registration data.
     * @returns Created user record or error if email is already in use.
     */
    async createUser(data: CreateUserInput): Promise<{ success: true; data: SanitizedUser } | { success: false; error: ErrorCode }> {
        data.email = data.email.trim().toLowerCase();

        const existingUsers = await this.userRepository.findMany({
            email: { operator: FilterOperator.EQ, value: data.email }
        });

        if (existingUsers.length > 0) {
            const existing = existingUsers[0];
            if (existing && !existing.emailVerifiedAt) {
                return { success: false, error: ErrorCode.EMAIL_NOT_VERIFIED };
            }
            return { success: false, error: ErrorCode.EMAIL_IN_USE };
        }

        const hashedPassword = await bcrypt.hash(data.password, USER_SERVICE_CONFIG.passwordHashRounds);
        const insertData: InsertUser = {
            ...data,
            birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
            password: hashedPassword,
        };
        const created = await this.userRepository.create(insertData);

        /**
         * @summary Removes the newly created user when downstream onboarding steps fail.
         */
        const rollbackUser = async () => {
            try {
                await this.userRepository.delete(created.id);
            } catch {
                // Ignore rollback failures to avoid masking the root error.
            }
        };

        try {
            const tokenResult = await this.tokenService.createEmailVerificationToken(created.id);
            if (!tokenResult.success || !tokenResult.data) {
                await rollbackUser();
                return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
            }

            await sendEmailVerificationEmail(
                created.email,
                tokenResult.data.token,
                created.id,
                created.language
            );
        } catch {
            await rollbackUser();
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }

        return {
            success: true,
            data: this.sanitizeUser(created)
        };
    }

        /**
     * @summary Retrieves users with optional pagination and sorting.
     * @param options - Query options for pagination and sorting.
     * @returns List of user records.
     */

    async getUsers(options?: QueryOptions<SelectUser>): Promise<{ success: true; data: SanitizedUser[] } | { success: false; error: ErrorCode }> {
        try {
            const users = await this.userRepository.findMany(undefined, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectUser,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return {
                success: true,
                data: users.map(u => this.sanitizeUser(u))
            };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts users.
     * @returns Total user count.
     */

    async countUsers(): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.userRepository.count();
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves a single user by ID.
     * @param id - ID of the user.
     * @returns User record if found, or error if not.
     */

    async getUserById(id: number): Promise<{ success: true; data: SanitizedUser } | { success: false; error: ErrorCode }> {
        const user = await this.userRepository.findById(id);
        if (!user) {
            return { success: false, error: ErrorCode.USER_NOT_FOUND };
        }
        return {
            success: true,
            data: this.sanitizeUser(user)
        };
    }

    /**
     * Searches for users by partial email using a LIKE clause.
     *
     * @summary Finds users matching email pattern.
     * @param emailTerm - Email search term (partial match).
     * @returns List of users matching the email filter.
     */
    async getUsersByEmail(emailTerm: string, options?: QueryOptions<SelectUser>): Promise<{ success: true; data: SanitizedUser[] } | { success: false; error: ErrorCode }> {
        try {
            const result = await this.userRepository.findMany({
                email: { operator: FilterOperator.LIKE, value: emailTerm }
            }, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectUser,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return {
                success: true,
                data: result.map(u => this.sanitizeUser(u))
            };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves users with exact email match.
     * @param email - Email to match exactly.
     * @returns List of users matching the exact email.
     */

    async getUserByEmailExact(email: string, options?: QueryOptions<SelectUser>): Promise<{ success: true; data: SanitizedUser[] } | { success: false; error: ErrorCode }> {
        try {
            const normalized = email.trim().toLowerCase();
            const result = await this.userRepository.findMany({
                email: { operator: FilterOperator.EQ, value: normalized }
            }, {
                limit: options?.limit,
                offset: options?.offset,
                sort: options?.sort as keyof SelectUser,
                order: options?.order === SortOrder.DESC ? SortOrder.DESC : SortOrder.ASC,
            });
            return {
                success: true,
                data: result.map(u => this.sanitizeUser(u))
            };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Retrieves a single user by exact email.
     * @param email - Email to match exactly.
     * @returns User record if found, or error if not.
     */

    async findUserByEmailExact(email: string): Promise<{ success: true; data: SanitizedUser } | { success: false; error: ErrorCode }> {
        try {
            const normalized = email.trim().toLowerCase();
            const result = await this.userRepository.findMany({
                email: { operator: FilterOperator.EQ, value: normalized }
            }, {
                limit: 2,
            });

            if (result.length === 0) {
                return { success: false, error: ErrorCode.USER_NOT_FOUND };
            }

            if (result.length > 1) {
                return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
            }

            return { success: true, data: this.sanitizeUser(result[0]) };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

        /**
     * @summary Counts users matching email pattern.
     * @param emailTerm - Email search term.
     * @returns Count of matching users.
     */

    async countUsersByEmail(emailTerm: string): Promise<{ success: true; data: number } | { success: false; error: ErrorCode }> {
        try {
            const count = await this.userRepository.count({
                email: { operator: FilterOperator.LIKE, value: emailTerm }
            });
            return { success: true, data: count };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }
    }

    /**
     * Updates a user by ID and rehashes the password if it has changed.
     *
     * @summary Updates user data with optional password rehashing.
     * @param id - ID of the user to update.
     * @param data - Partial user data.
     * @returns Updated user or error if not found.
     */
    async updateUser(id: number, data: UpdateUserInput): Promise<{ success: true; data: SanitizedUser } | { success: false; error: ErrorCode }> {
        const current = await this.userRepository.findById(id);
        if (!current) {
            return { success: false, error: ErrorCode.NO_RECORDS_FOUND };
        }

        if (data.password && current.password) {
            const isSamePassword = await bcrypt.compare(data.password, current.password);
            if (!isSamePassword) {
                data.password = await bcrypt.hash(data.password, USER_SERVICE_CONFIG.passwordHashRounds);
            } else {
                delete data.password;
            }
        }

        const { birthDate, ...restUpdate } = data;
        const updateData: Partial<InsertUser> = {
            ...restUpdate,
        };
        if (birthDate !== undefined) {
            updateData.birthDate = new Date(birthDate);
        }
        const updated = await this.userRepository.update(id, updateData);
        return {
            success: true,
            data: this.sanitizeUser(updated)
        };
    }

    /**
     * Marks a user's email as verified.
     *
     * @summary Marks the user email as verified by setting the verification timestamp.
     * @param userId - User ID.
     * @returns Updated user or error.
     */
    async markEmailVerified(userId: number): Promise<{ success: true; data: SanitizedUser } | { success: false; error: ErrorCode }> {
        const existing = await this.userRepository.findById(userId);
        if (!existing) {
            return { success: false, error: ErrorCode.USER_NOT_FOUND };
        }

        if (existing.emailVerifiedAt) {
            return { success: true, data: this.sanitizeUser(existing) };
        }

        const updated = await this.userRepository.update(userId, { emailVerifiedAt: new Date() });
        return { success: true, data: this.sanitizeUser(updated) };
    }

    /**
     * Deletes a user by ID after validating its existence.
     *
     * @summary Removes a user from the database.
     * @param id - ID of the user to delete.
     * @returns Success with deleted ID, or error if user does not exist.
     */
    async deleteUser(id: number): Promise<{ success: true; data: { id: number } } | { success: false; error: ErrorCode }> {
        const existingUser = await this.userRepository.findById(id);
        if (!existingUser) {
            return { success: false, error: ErrorCode.USER_NOT_FOUND };
        }

        await this.userRepository.delete(id);
        return { success: true, data: { id } };
    }

        /**
     * @summary Retrieves user by ID without sanitization.
     * @param id - User ID.
     * @returns User record or error.
     */

    async findOne(id: number): Promise<{ success: true; data: UserEntity } | { success: false; error: ErrorCode }> {
        const user = await this.userRepository.findById(id);
        if (!user) {
            return { success: false, error: ErrorCode.USER_NOT_FOUND };
        }
        return { success: true, data: this.toUserEntity(user) };
    }

    /**
     * Uploads an avatar image to FTP storage and updates the user's avatar URL.
     *
     * @summary Uploads user avatar and persists the public URL.
     * @param userId - ID of the user uploading an avatar.
     * @param file - Multer file buffer for the avatar.
     * @returns Public URL of the uploaded avatar or an error.
     */
    async uploadAvatar(userId: number, file: Express.Multer.File): Promise<{ success: true; data: { url: string } } | { success: false; error: ErrorCode }> {
        const existingUser = await this.userRepository.findById(userId);
        if (!existingUser) {
            return { success: false, error: ErrorCode.USER_NOT_FOUND };
        }

        const host = process.env.FTP_HOST;
        const user = process.env.FTP_USER;
        const password = process.env.FTP_PASSWORD;
        const uploadPath = process.env.FTP_UPLOAD_PATH;
        const portValue = Number(process.env.FTP_PORT ?? USER_SERVICE_CONFIG.defaultFtpPort);
        const port = Number.isFinite(portValue) ? portValue : USER_SERVICE_CONFIG.defaultFtpPort;

        if (!host || !user || !password || !uploadPath) {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        }

        const extension = resolveAvatarExtension(file.mimetype);
        const fileName = `${USER_SERVICE_CONFIG.avatarFileBase}.${extension}`;
        const normalizedPath = uploadPath.replace(/\/$/, '');
        const userAvatarPath = `${normalizedPath}/${userId}/${USER_SERVICE_CONFIG.avatarDirectory}`;
        const publicUrl = `${USER_SERVICE_CONFIG.avatarPublicBaseUrl}/${userId}/${USER_SERVICE_CONFIG.avatarDirectory}/${fileName}`;
        const ftpClient = new FtpClient();

        try {
            await ftpClient.access({
                host,
                port,
                user,
                password,
            });
            await ftpClient.ensureDir(userAvatarPath);
            const files = await ftpClient.list();
            const existingBackups = files.filter((entry) =>
                entry.name.startsWith(`${USER_SERVICE_CONFIG.avatarBackupBase}.`)
            );
            for (const backup of existingBackups) {
                try {
                    await ftpClient.remove(backup.name);
                } catch {
                    // Ignore cleanup failures to avoid blocking upload.
                }
            }
            const existingAvatar = files.find((entry) =>
                entry.name.startsWith(`${USER_SERVICE_CONFIG.avatarFileBase}.`)
            );
            if (existingAvatar) {
                const currentExtension = path.extname(existingAvatar.name) || `.${extension}`;
                const backupName = `${USER_SERVICE_CONFIG.avatarBackupBase}${currentExtension}`;
                try {
                    await ftpClient.rename(existingAvatar.name, backupName);
                } catch {
                    // Ignore rename failures and attempt upload anyway.
                }
            }
            await ftpClient.uploadFrom(Readable.from(file.buffer), fileName);
            await this.userRepository.update(userId, { avatarUrl: publicUrl });
            return { success: true, data: { url: publicUrl } };
        } catch {
            return { success: false, error: ErrorCode.INTERNAL_SERVER_ERROR };
        } finally {
            ftpClient.close();
        }
    }
}
