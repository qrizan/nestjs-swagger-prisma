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
  Query,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { saveImage } from 'src/utils/image-upload';
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
      // Batas ditegakkan multer, sebelum apa pun ditulis ke disk.
      storage: memoryStorage(),
      limits: { fileSize: 500000 },
    }),
  )
  async avatar(
    @Req() req,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    const filename = await saveImage(file.buffer, 'public/uploads/avatar');

    return await this.profileService.uploadAvatar(
      req.user.id,
      '/uploads/avatar/' + filename,
    );
  }

  @Roles(['USER'])
  @Delete('delete')
  async deleteUser(@Req() req) {
    return await this.profileService.deleteUser(req.user.id);
  }
}
