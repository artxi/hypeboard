export interface SoundPreference {
  volume: number;
  isFavorite: boolean;
}

export interface UserPreferences {
  soundPreferences: Record<string, SoundPreference>;
}
