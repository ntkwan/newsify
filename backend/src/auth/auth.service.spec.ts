import { MailerService } from '@nestjs-modules/mailer';
import {
    BadRequestException,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../users/entities/user.model';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';
import { TokensDto } from './dtos/tokens.dto';
import { UserLoginDto } from './dtos/user-signin.dto';
import { UserSignUpDto } from './dtos/user-signup.dto';
import { Role } from './enums/roles.enum';

describe('AuthService', () => {
    let service: AuthService;
    let usersRepository: jest.Mocked<UsersRepository>;
    let jwtService: jest.Mocked<JwtService>;
    let configService: jest.Mocked<ConfigService>;
    let mailerService: jest.Mocked<MailerService>;

    const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        otp: '123456',
        otpExpiry: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
    } as User;

    const mockUserLoginDto: UserLoginDto = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        role: Role.EMPLOYEE,
    };

    const mockUserSignUpDto: UserSignUpDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
    };

    beforeEach(async () => {
        const mockUsersRepository = {
            findOneByEmail: jest.fn(),
            validatePassword: jest.fn(),
            createUser: jest.fn(),
            updateRefreshToken: jest.fn(),
            updateOtp: jest.fn(),
            findOneByRefreshToken: jest.fn(),
            deleteByRefreshToken: jest.fn(),
            findOneById: jest.fn(),
            updatePassword: jest.fn(),
            findOneByOtp: jest.fn(),
            findByOtpOnly: jest.fn(),
            hashPassword: jest.fn(),
        };

        const mockJwtService = {
            signAsync: jest.fn(),
            decode: jest.fn(),
            verify: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn(),
        };

        const mockMailerService = {
            sendMail: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersRepository,
                    useValue: mockUsersRepository,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: MailerService,
                    useValue: mockMailerService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersRepository = module.get(UsersRepository);
        jwtService = module.get(JwtService);
        configService = module.get(ConfigService);
        mailerService = module.get(MailerService);

        // Setup default config values
        configService.get.mockImplementation((key: string) => {
            const config = {
                AT_SECRET: 'access-token-secret',
                RT_SECRET: 'refresh-token-secret',
                OPENAI_MODEL: 'gpt-3.5-turbo',
            };
            return config[key];
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateUser', () => {
        it('should return user when credentials are valid', async () => {
            // Arrange
            const username = 'test@example.com';
            const password = 'password123';
            usersRepository.findOneByEmail.mockResolvedValue(mockUser);
            usersRepository.validatePassword.mockResolvedValue(true);

            // Act
            const result = await service.validateUser(username, password);

            // Assert
            expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(
                username,
            );
            expect(usersRepository.validatePassword).toHaveBeenCalledWith(
                password,
                mockUser,
            );
            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found', async () => {
            // Arrange
            const username = 'nonexistent@example.com';
            const password = 'password123';
            usersRepository.findOneByEmail.mockResolvedValue(null);

            // Act
            const result = await service.validateUser(username, password);

            // Assert
            expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(
                username,
            );
            expect(usersRepository.validatePassword).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        it('should return null when password is invalid', async () => {
            // Arrange
            const username = 'test@example.com';
            const password = 'wrongpassword';
            usersRepository.findOneByEmail.mockResolvedValue(mockUser);
            usersRepository.validatePassword.mockResolvedValue(false);

            // Act
            const result = await service.validateUser(username, password);

            // Assert
            expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(
                username,
            );
            expect(usersRepository.validatePassword).toHaveBeenCalledWith(
                password,
                mockUser,
            );
            expect(result).toBeNull();
        });
    });

    describe('signIn', () => {
        it('should return tokens when sign in is successful', async () => {
            // Arrange
            const accessToken = 'access-token';
            const refreshToken = 'refresh-token';
            const expectedTokens: TokensDto = { accessToken, refreshToken };

            jwtService.signAsync
                .mockResolvedValueOnce(accessToken)
                .mockResolvedValueOnce(refreshToken);
            usersRepository.updateRefreshToken.mockResolvedValue(undefined);
            usersRepository.updateOtp.mockResolvedValue(undefined);

            // Act
            const result = await service.signIn(mockUserLoginDto);

            // Assert
            expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
            expect(jwtService.signAsync).toHaveBeenNthCalledWith(
                1,
                {
                    id: mockUserLoginDto.id,
                    email: mockUserLoginDto.email,
                    username: mockUserLoginDto.username,
                    role: mockUserLoginDto.role,
                },
                {
                    expiresIn: '1h',
                    secret: 'access-token-secret',
                },
            );
            expect(jwtService.signAsync).toHaveBeenNthCalledWith(
                2,
                {
                    id: mockUserLoginDto.id,
                    email: mockUserLoginDto.email,
                    role: mockUserLoginDto.role,
                },
                {
                    expiresIn: '7d',
                    secret: 'refresh-token-secret',
                },
            );
            expect(usersRepository.updateRefreshToken).toHaveBeenCalledWith(
                mockUserLoginDto.id,
                refreshToken,
            );
            expect(usersRepository.updateOtp).toHaveBeenCalledWith(
                mockUserLoginDto.id,
                null,
                null,
            );
            expect(result).toEqual(expectedTokens);
        });

        it('should throw InternalServerErrorException when sign in fails', async () => {
            // Arrange
            const error = new Error('JWT signing failed');
            jwtService.signAsync.mockRejectedValue(error);

            // Act & Assert
            await expect(service.signIn(mockUserLoginDto)).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });

    describe('signUp', () => {
        it('should create new user successfully', async () => {
            // Arrange
            const newUser = {
                ...mockUser,
                id: '2',
                email: 'newuser@example.com',
                username: 'newuser',
            } as User;
            usersRepository.findOneByEmail.mockResolvedValue(null);
            usersRepository.createUser.mockResolvedValue(newUser);

            // Act
            const result = await service.signUp(mockUserSignUpDto);

            // Assert
            expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(
                mockUserSignUpDto.email,
            );
            expect(usersRepository.createUser).toHaveBeenCalledWith(
                mockUserSignUpDto,
            );
            expect(result).toEqual({
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
            });
        });

        it('should throw BadRequestException when user already exists', async () => {
            // Arrange
            usersRepository.findOneByEmail.mockResolvedValue(mockUser);

            // Act & Assert
            await expect(service.signUp(mockUserSignUpDto)).rejects.toThrow(
                BadRequestException,
            );
            expect(usersRepository.createUser).not.toHaveBeenCalled();
        });

        it('should throw InternalServerErrorException when user creation fails', async () => {
            // Arrange
            const error = new Error('Database error');
            usersRepository.findOneByEmail.mockResolvedValue(null);
            usersRepository.createUser.mockRejectedValue(error);

            // Act & Assert
            await expect(service.signUp(mockUserSignUpDto)).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });

    describe('signOut', () => {
        it('should update refresh token to null', async () => {
            // Arrange
            usersRepository.updateRefreshToken.mockResolvedValue(undefined);

            // Act
            await service.signOut(mockUserLoginDto);

            // Assert
            expect(usersRepository.updateRefreshToken).toHaveBeenCalledWith(
                mockUserLoginDto.id,
                'null',
            );
        });

        it('should throw InternalServerErrorException when sign out fails', async () => {
            // Arrange
            const error = new Error('Database error');
            usersRepository.updateRefreshToken.mockRejectedValue(error);

            // Act & Assert
            await expect(service.signOut(mockUserLoginDto)).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });

    describe('getNewTokens', () => {
        it('should return new access token when refresh token is valid', async () => {
            // Arrange
            const refreshToken = 'valid-refresh-token';
            const newAccessToken = 'new-access-token';
            const decodedToken = {
                id: '1',
                email: 'test@example.com',
                role: Role.EMPLOYEE,
            };

            jwtService.decode.mockReturnValue(decodedToken);
            usersRepository.findOneByRefreshToken.mockResolvedValue(
                refreshToken,
            );
            jwtService.verify.mockReturnValue(decodedToken);
            usersRepository.findOneByEmail.mockResolvedValue(mockUser);
            jwtService.signAsync.mockResolvedValue(newAccessToken);

            // Act
            const result = await service.getNewTokens(refreshToken);

            // Assert
            expect(jwtService.decode).toHaveBeenCalledWith(refreshToken);
            expect(usersRepository.findOneByRefreshToken).toHaveBeenCalledWith(
                decodedToken.id,
            );
            expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
                secret: 'refresh-token-secret',
            });
            expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(
                decodedToken.email,
            );
            expect(jwtService.signAsync).toHaveBeenCalledWith(
                {
                    id: decodedToken.id,
                    username: mockUser.username,
                    role: decodedToken.role,
                },
                {
                    expiresIn: '1h',
                    secret: 'access-token-secret',
                },
            );
            expect(result).toEqual({
                accessToken: newAccessToken,
                refreshToken: refreshToken,
            });
        });

        it('should throw UnauthorizedException when refresh token not found', async () => {
            // Arrange
            const refreshToken = 'invalid-refresh-token';
            const decodedToken = {
                id: '1',
                email: 'test@example.com',
                role: Role.EMPLOYEE,
            };

            jwtService.decode.mockReturnValue(decodedToken);
            usersRepository.findOneByRefreshToken.mockResolvedValue(null);

            // Act & Assert
            await expect(service.getNewTokens(refreshToken)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw UnauthorizedException when refresh token mismatch', async () => {
            // Arrange
            const refreshToken = 'valid-refresh-token';
            const storedToken = 'different-refresh-token';
            const decodedToken = {
                id: '1',
                email: 'test@example.com',
                role: Role.EMPLOYEE,
            };

            jwtService.decode.mockReturnValue(decodedToken);
            usersRepository.findOneByRefreshToken.mockResolvedValue(
                storedToken,
            );

            // Act & Assert
            await expect(service.getNewTokens(refreshToken)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw UnauthorizedException when user not found', async () => {
            // Arrange
            const refreshToken = 'valid-refresh-token';
            const decodedToken = {
                id: '1',
                email: 'test@example.com',
                role: Role.EMPLOYEE,
            };

            jwtService.decode.mockReturnValue(decodedToken);
            usersRepository.findOneByRefreshToken.mockResolvedValue(
                refreshToken,
            );
            jwtService.verify.mockReturnValue(decodedToken);
            usersRepository.findOneByEmail.mockResolvedValue(null);

            // Act & Assert
            await expect(service.getNewTokens(refreshToken)).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should handle JWT verification errors', async () => {
            // Arrange
            const refreshToken = 'invalid-refresh-token';
            const decodedToken = {
                id: '1',
                email: 'test@example.com',
                role: Role.EMPLOYEE,
            };

            jwtService.decode.mockReturnValue(decodedToken);
            usersRepository.findOneByRefreshToken.mockResolvedValue(
                refreshToken,
            );
            jwtService.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            // Act & Assert
            await expect(service.getNewTokens(refreshToken)).rejects.toThrow(
                UnauthorizedException,
            );
            expect(usersRepository.deleteByRefreshToken).toHaveBeenCalledWith(
                refreshToken,
            );
        });
    });

    describe('forgotPassword', () => {
        it('should send OTP email successfully', async () => {
            // Arrange
            const email = 'test@example.com';
            usersRepository.findOneByEmail.mockResolvedValue(mockUser);
            usersRepository.updateOtp.mockResolvedValue(undefined);
            mailerService.sendMail.mockResolvedValue(undefined);

            // Act
            await service.forgotPassword(email);

            // Assert
            expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(email);
            expect(usersRepository.updateOtp).toHaveBeenCalledWith(
                email,
                expect.any(String),
                expect.any(Date),
            );
            expect(mailerService.sendMail).toHaveBeenCalledWith({
                to: email,
                subject:
                    '[Newsify - Online Newspaper System] Reset Password OTP',
                text: expect.stringContaining('Your OTP is:'),
            });
        });

        it('should throw InternalServerErrorException when user not found', async () => {
            // Arrange
            const email = 'nonexistent@example.com';
            usersRepository.findOneByEmail.mockResolvedValue(null);

            // Act & Assert
            await expect(service.forgotPassword(email)).rejects.toThrow(
                InternalServerErrorException,
            );
        });

        it('should throw InternalServerErrorException when email sending fails', async () => {
            // Arrange
            const email = 'test@example.com';
            const error = new Error('Email service error');
            usersRepository.findOneByEmail.mockResolvedValue(mockUser);
            usersRepository.updateOtp.mockResolvedValue(undefined);
            mailerService.sendMail.mockRejectedValue(error);

            // Act & Assert
            await expect(service.forgotPassword(email)).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });

    describe('verifyOtp', () => {
        it('should verify OTP successfully', async () => {
            // Arrange
            const email = 'test@example.com';
            const otp = '123456';
            usersRepository.findOneByOtp.mockResolvedValue(mockUser);

            // Act
            await service.verifyOtp(email, otp);

            // Assert
            expect(usersRepository.findOneByOtp).toHaveBeenCalledWith(
                email,
                otp,
            );
        });

        it('should throw InternalServerErrorException when user not found', async () => {
            // Arrange
            const email = 'nonexistent@example.com';
            const otp = '123456';
            usersRepository.findOneByOtp.mockResolvedValue(null);

            // Act & Assert
            await expect(service.verifyOtp(email, otp)).rejects.toThrow(
                InternalServerErrorException,
            );
        });

        it('should throw InternalServerErrorException when OTP is invalid', async () => {
            // Arrange
            const email = 'test@example.com';
            const otp = '000000'; // Wrong OTP
            usersRepository.findOneByOtp.mockResolvedValue(null);

            // Act & Assert
            await expect(service.verifyOtp(email, otp)).rejects.toThrow(
                InternalServerErrorException,
            );
        });

        it('should throw InternalServerErrorException when OTP is expired', async () => {
            // Arrange
            const email = 'test@example.com';
            const otp = '123456';
            const expiredUser = {
                ...mockUser,
                otpExpiry: new Date(Date.now() - 1000), // Expired
            } as User;
            usersRepository.findOneByOtp.mockResolvedValue(expiredUser);

            // Act & Assert
            await expect(service.verifyOtp(email, otp)).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            // Arrange
            const id = '1';
            const oldPassword = 'oldpassword';
            const newPassword = 'newpassword';
            const confirmPassword = 'newpassword';

            usersRepository.findOneById.mockResolvedValue(mockUser);
            usersRepository.validatePassword.mockResolvedValue(true);
            usersRepository.hashPassword.mockResolvedValue('hashedNewPassword');
            usersRepository.updatePassword.mockResolvedValue(undefined);

            // Act
            await service.changePassword(
                id,
                oldPassword,
                newPassword,
                confirmPassword,
            );

            // Assert
            expect(usersRepository.findOneById).toHaveBeenCalledWith(id);
            expect(usersRepository.validatePassword).toHaveBeenCalledWith(
                oldPassword,
                mockUser,
            );
            expect(usersRepository.updatePassword).toHaveBeenCalledWith(
                mockUser.email,
                'hashedNewPassword',
            );
        });

        it('should throw NotFoundException when user not found', async () => {
            // Arrange
            const id = '999';
            usersRepository.findOneById.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.changePassword(id, 'old', 'new', 'new'),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException when old password is incorrect', async () => {
            // Arrange
            const id = '1';
            usersRepository.findOneById.mockResolvedValue(mockUser);
            usersRepository.validatePassword.mockResolvedValue(false);

            // Act & Assert
            await expect(
                service.changePassword(id, 'wrong', 'new', 'new'),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException when passwords do not match', async () => {
            // Arrange
            const id = '1';
            usersRepository.findOneById.mockResolvedValue(mockUser);

            // Act & Assert
            await expect(
                service.changePassword(id, 'old', 'new', 'different'),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            // Arrange
            const email = 'test@example.com';
            const otp = '123456';
            const newPassword = 'newpassword';
            const confirmPassword = 'newpassword';

            usersRepository.findByOtpOnly.mockResolvedValue(mockUser);
            usersRepository.hashPassword.mockResolvedValue('hashedNewPassword');
            usersRepository.updatePassword.mockResolvedValue(undefined);

            // Act
            await service.resetPassword(
                email,
                otp,
                newPassword,
                confirmPassword,
            );

            // Assert
            expect(usersRepository.findByOtpOnly).toHaveBeenCalledWith(
                email,
                otp,
            );
            expect(usersRepository.updatePassword).toHaveBeenCalledWith(
                email,
                'hashedNewPassword',
            );
        });

        it('should throw InternalServerErrorException when user not found', async () => {
            // Arrange
            const email = 'nonexistent@example.com';
            usersRepository.findByOtpOnly.mockRejectedValue(
                new Error('User not found'),
            );

            // Act & Assert
            await expect(
                service.resetPassword(email, '123456', 'new', 'new'),
            ).rejects.toThrow(InternalServerErrorException);
        });

        it('should throw InternalServerErrorException when OTP is invalid', async () => {
            // Arrange
            const email = 'test@example.com';
            const otp = '000000';
            usersRepository.findByOtpOnly.mockRejectedValue(
                new Error('Invalid OTP'),
            );

            // Act & Assert
            await expect(
                service.resetPassword(email, otp, 'new', 'new'),
            ).rejects.toThrow(InternalServerErrorException);
        });

        it('should throw InternalServerErrorException when passwords do not match', async () => {
            // Arrange
            const email = 'test@example.com';
            const otp = '123456';
            usersRepository.findByOtpOnly.mockResolvedValue(mockUser);

            // Act & Assert
            await expect(
                service.resetPassword(email, otp, 'new', 'different'),
            ).rejects.toThrow(InternalServerErrorException);
        });
    });
});
