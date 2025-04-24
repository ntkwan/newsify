import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './entities/user.model';
import bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { UserSignUpDto } from '../auth/dtos/user-signup.dto';
@Injectable()
export class UsersRepository {
    constructor(
        @InjectModel(User) private readonly userModel: typeof User,
        private readonly configService: ConfigService,
        private readonly mailerService: MailerService,
        @InjectRedis() private readonly redisClient: Redis,
    ) {}

    async validatePassword(password: string, user: User): Promise<boolean> {
        try {
            return await bcrypt.compare(password, user.password);
        } catch (error: any) {
            throw new InternalServerErrorException((error as Error).message);
        }
    }

    async hashPassword(password: string): Promise<string> {
        try {
            const salt: string = await bcrypt.genSalt(
                parseInt(this.configService.get('SALT'), 10),
            );

            const hashedPassword: string = await bcrypt.hash(password, salt);

            return hashedPassword;
        } catch (error) {
            throw new InternalServerErrorException((error as Error).message);
        }
    }

    async findOneByEmail(email: string): Promise<User> {
        try {
            const project = await this.userModel.findOne<User>({
                where: { email },
            });

            if (!project) {
                return null;
            }

            return project.dataValues as User;
        } catch (error: any) {
            throw new InternalServerErrorException((error as Error).message);
        }
    }

    async findOneByUsername(username: string): Promise<User> {
        try {
            const project = await this.userModel.findOne<User>({
                where: { username },
            });

            return project.dataValues as User;
        } catch (error: any) {
            throw new InternalServerErrorException((error as Error).message);
        }
    }

    async findOneById(id: string): Promise<User> {
        try {
            const project = await this.userModel.findOne<User>({
                where: { id },
            });
            return project.dataValues as User;
        } catch (error) {
            throw new InternalServerErrorException((error as Error).message);
        }
    }

    async updateRefreshToken(id: string, refreshToken: string): Promise<void> {
        if (refreshToken !== 'null') {
            await this.redisClient.set(
                `refreshToken:${id}`,
                refreshToken,
                'EX',
                7 * 24 * 60 * 60,
            ); // 7 days expiration
        } else {
            await this.redisClient.del(`refreshToken:${id}`);
        }
    }

    async updatePassword(email: string, password: string): Promise<void> {
        try {
            await this.userModel.update(
                { password: password, otp: null, otpExpiry: null },
                { where: { email: email } },
            );
        } catch (error: any) {
            throw new InternalServerErrorException((error as Error).message);
        }
    }

    async updateOtp(
        email: string,
        otp: string,
        otpExpiry: Date,
    ): Promise<void> {
        try {
            await this.userModel.update(
                { otp: otp, otpExpiry: otpExpiry },
                { where: { email: email } },
            );
        } catch (error: any) {
            throw new InternalServerErrorException((error as Error).message);
        }
    }

    async findOneByRefreshToken(userId: string): Promise<string> {
        const token = await this.redisClient.get(`refreshToken:${userId}`);
        if (!token) {
            throw new NotFoundException('Refresh token not found');
        }
        return token;
    }

    async deleteByRefreshToken(refreshToken: string): Promise<void> {
        await this.redisClient.del(`refreshToken:${refreshToken}`);
    }

    async findOneByOtp(email: string, otp: string): Promise<User> {
        try {
            const project = await this.userModel.findOne<User>({
                where: { email, otp },
            });
            return project.dataValues as User;
        } catch (error) {
            throw new InternalServerErrorException((error as Error).message);
        }
    }

    async findByOtpOnly(email: string, otp: string): Promise<User> {
        const project = await this.userModel.findOne<User>({
            where: { email, otp },
        });
        if (!project) {
            throw new InternalServerErrorException(
                `User ${email} with the OTP not found`,
            );
        }
        return project.dataValues as User;
    }

    async createUser(user: UserSignUpDto): Promise<User> {
        const newUser = await this.userModel.create({
            username: user.username,
            email: user.email,
            password: await this.hashPassword(user.password),
            otp: null,
            otpExpiry: null,
        });
        return newUser.dataValues as User;
    }
}
