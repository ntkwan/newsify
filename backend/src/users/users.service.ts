import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from './entities/user.model';
@Injectable()
export class UsersService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async getMyProfile(profileUser: User): Promise<{
        email: string;
        username: string;
        id: string;
    }> {
        try {
            const { id } = profileUser;
            const user = await this.usersRepository.findOneById(id);

            if (!user) {
                throw new BadRequestException('User not found');
            }

            const newUser = {
                email: user.email,
                username: user.username,
                id: user.id,
            };
            return newUser;
        } catch (error) {
            throw new InternalServerErrorException(
                'Error getting profile',
                error.message,
            );
        }
    }
}
