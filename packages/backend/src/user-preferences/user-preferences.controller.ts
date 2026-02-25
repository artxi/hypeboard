import { Controller, Get, Put, Body, Param, Req, UseGuards } from '@nestjs/common';
import { UserPreferencesService } from './user-preferences.service';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user-preferences')
@UseGuards(JwtAuthGuard)
export class UserPreferencesController {
  constructor(private readonly userPreferencesService: UserPreferencesService) {}

  @Get(':boardId')
  async getPreferences(@Req() req, @Param('boardId') boardId: string) {
    const userId = req.user._id.toString();
    const preferences = await this.userPreferencesService.getPreferences(userId, boardId);

    // Convert Map to plain object for JSON serialization
    return {
      soundPreferences: Object.fromEntries(preferences.soundPreferences),
    };
  }

  @Put(':soundId')
  async updateSoundPreference(
    @Req() req,
    @Param('soundId') soundId: string,
    @Body() updateDto: UpdatePreferenceDto,
    @Body('boardId') boardId: string,
  ) {
    const userId = req.user._id.toString();
    const preferences = await this.userPreferencesService.updateSoundPreference(
      userId,
      soundId,
      boardId,
      updateDto,
    );

    return {
      soundPreferences: Object.fromEntries(preferences.soundPreferences),
    };
  }

  @Get(':boardId/favorites')
  async getFavorites(@Req() req, @Param('boardId') boardId: string) {
    const userId = req.user._id.toString();
    const favorites = await this.userPreferencesService.getFavorites(userId, boardId);
    return { favorites };
  }
}
