import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from './entities/user.model';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
    let service: UsersService;
    let usersRepository: jest.Mocked<UsersRepository>;

    const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        otp: null,
        otpExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as User;

    beforeEach(async () => {
        const mockUsersRepository = {
            findOneById: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: UsersRepository,
                    useValue: mockUsersRepository,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        usersRepository = module.get(UsersRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getMyProfile', () => {
        it('should return user profile when user exists', async () => {
            // Arrange
            const profileUser = { id: '1' } as User;
            usersRepository.findOneById.mockResolvedValue(mockUser);

            // Act
            const result = await service.getMyProfile(profileUser);

            // Assert
            expect(usersRepository.findOneById).toHaveBeenCalledWith('1');
            expect(result).toEqual({
                email: 'test@example.com',
                username: 'testuser',
                id: '1',
            });
        });

        it('should throw InternalServerErrorException when user not found', async () => {
            // Arrange
            const profileUser = { id: '999' } as User;
            usersRepository.findOneById.mockResolvedValue(null);

            // Act & Assert
            await expect(service.getMyProfile(profileUser)).rejects.toThrow(
                InternalServerErrorException,
            );
            expect(usersRepository.findOneById).toHaveBeenCalledWith('999');
        });

        it('should throw InternalServerErrorException when repository throws error', async () => {
            // Arrange
            const profileUser = { id: '1' } as User;
            const repositoryError = new Error('Database connection failed');
            usersRepository.findOneById.mockRejectedValue(repositoryError);

            // Act & Assert
            await expect(service.getMyProfile(profileUser)).rejects.toThrow(
                InternalServerErrorException,
            );
            expect(usersRepository.findOneById).toHaveBeenCalledWith('1');
        });

        it('should handle repository errors and wrap them in InternalServerErrorException', async () => {
            // Arrange
            const profileUser = { id: '1' } as User;
            const repositoryError = new Error('Database timeout');
            usersRepository.findOneById.mockRejectedValue(repositoryError);

            // Act & Assert
            try {
                await service.getMyProfile(profileUser);
            } catch (error) {
                expect(error).toBeInstanceOf(InternalServerErrorException);
                expect(error.message).toBe('Error getting profile');
                expect(error.getResponse()).toEqual({
                    error: 'Database timeout',
                    message: 'Error getting profile',
                    statusCode: 500,
                });
            }
        });
    });
});
