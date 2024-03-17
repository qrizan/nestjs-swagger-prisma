import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { compare, hash } from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { jwtConfig } from 'src/utils/jwt.config';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: RegisterDto) {
    data.username = sanitizeHtml(data.username).trim();
    data.email = sanitizeHtml(data.email).trim();
    data.password = await hash(sanitizeHtml(data.password).trim(), 12);
    data.avatar = '/uploads/avatar/default.png';

    const checkUserExists = await this.prisma.user.findFirst({
      where: {
        email: data.email,
        deletedAt: null,
      },
    });

    if (checkUserExists) {
      throw new HttpException('User already registered', HttpStatus.FOUND);
    }

    const createUser = await this.prisma.user.create({
      data: data,
    });

    if (createUser) {
      return {
        statusCode: HttpStatus.OK,
        message: 'Register successfull',
      };
    }
  }

  async login(data: LoginDto) {
    data.email = sanitizeHtml(data.email).trim();
    data.password = sanitizeHtml(data.password).trim();

    const checkUserExists = await this.prisma.user.findFirst({
      where: {
        email: data.email.trim(),
        deletedAt: null,
      },
    });

    if (!checkUserExists) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const checkPassword = await compare(
      data.password,
      checkUserExists.password,
    );

    if (checkPassword) {
      const accessToken = this.generateJWT({
        sub: checkUserExists.id,
        role: checkUserExists.role,
        email: checkUserExists.email,
      });

      return {
        statusCode: 200,
        accessToken,
        message: 'Login successfull',
      };
    }

    throw new HttpException(
      'User or password not match',
      HttpStatus.UNAUTHORIZED,
    );
  }

  generateJWT(payload: any) {
    return this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.expired,
    });
  }
}
