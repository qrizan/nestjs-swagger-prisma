import {
  Controller,
  Patch,
  Delete,
  Body,
  Get,
  Post,
  UploadedFile,
  Req,
  UseInterceptors,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RolesGuard } from 'src/roles/roles.guard';
import { Reflector } from '@nestjs/core';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiBearerAuth('accessToken')
@ApiTags('User')
@UseGuards(AuthGuard, new RolesGuard(new Reflector()))
@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Roles(['USER'])
  @ApiQuery({
    name: 'cursor',
    required: false,
  })
  @Get('?')
  async getUserProfile(@Req() req, @Query('cursor') cursor: string) {
    return await this.profileService.getUserProfile(req.user.id, cursor);
  }

  @Roles(['USER'])
  @Patch('update')
  async updateUser(@Req() req, @Body() body: UpdateUserDto) {
    return await this.profileService.updateUser(req.user.id, body);
  }

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Roles(['USER'])
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: 'public/uploads/avatar',
        filename: (req, file, cb) => {
          const suffix = Date.now() + Math.round(Math.random() * 1e9);
          cb(null, suffix + '.' + file.originalname.split('.').pop());
        },
      }),
    }),
  )
  async avatar(
    @Req() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500000 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.profileService.uploadAvatar(
      req.user.id,
      '/uploads/avatar/' + file.filename,
    );
  }

  @Roles(['USER'])
  @Delete('delete')
  async deleteUser(@Req() req) {
    return await this.profileService.deleteUser(req.user.id);
  }
}
