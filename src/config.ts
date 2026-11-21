import { AchievementId, EndingId, GameSettings, KeyAction, KeyBindings, QualityLevel } from './types';

// Toàn bộ hằng số cân bằng và cấu hình đặt tập trung tại đây

export const GAME_CONFIG = {
  TITLE: 'CĂN NHÀ LÚC 3 GIỜ SÁNG',
  SAVE_STORAGE_KEY: 'save_v1',
  SETTINGS_STORAGE_KEY: 'settings_v1',
  ENDINGS_STORAGE_KEY: 'endings_v1',
  STATS_STORAGE_KEY: 'stats_v1',
  WARNING_ACK_KEY: 'warning_ack_v1',
  SAVE_VERSION: 1,

  // Vòng lặp cố định 60 Hz
  FIXED_TIMESTEP: 1 / 60,
  MAX_DELTA: 0.1,

  // Thời gian trong game: 03:00 -> 06:00 trong 1800 giây thực
  START_CLOCK_HOUR: 3,
  END_CLOCK_HOUR: 6,
  TOTAL_REAL_SECONDS: 1800, // 30 phút thực = 3 giờ game

  // Kích thước kiến trúc (mét)
  CEILING_HEIGHT: 2.8,
  WALL_THICKNESS: 0.2,
  DOOR_WIDTH: 1.0,
  DOOR_HEIGHT: 2.1,
  FLOOR_SLAB_THICKNESS: 0.2,

  // Thông số người chơi
  PLAYER_RADIUS: 0.3,
  PLAYER_STAND_HEIGHT: 1.65,
  PLAYER_CROUCH_HEIGHT: 1.0,
  PLAYER_EYE_STAND: 1.55,
  PLAYER_EYE_CROUCH: 0.92,
  PLAYER_WALK_SPEED: 2.2,
  PLAYER_SPRINT_SPEED: 4.2,
  PLAYER_CROUCH_SPEED: 1.2,
  PLAYER_NOCLIP_SPEED: 6.5,
  PLAYER_START_POS: { x: 2.5, y: 0, z: 2.5 },
  PLAYER_START_YAW: -Math.PI * 0.5, // nhìn về hướng đông (cửa ra hành lang)
  STAMINA_MAX_SECONDS: 5.0,
  STAMINA_RECOVER_SECONDS: 4.0,
  CAMERA_FOV: 68,
  CAMERA_NEAR: 0.08,
  CAMERA_FAR: 48,
  STUCK_THRESHOLD_SECONDS: 3.0,

  // Đèn pin và pin
  FLASHLIGHT_ANGLE_DEG: 32,
  FLASHLIGHT_PENUMBRA: 0.5,
  FLASHLIGHT_DISTANCE: 18,
  FLASHLIGHT_INTENSITY_MAX: 3.4,
  FLASHLIGHT_DRAIN_SECONDS: 300, // 100% -> 0% trong 300 giây
  FLASHLIGHT_LOW_BATTERY_THRESHOLD: 20,
  BATTERY_PICKUP_AMOUNT: 60,

  // Túi đồ & tương tác
  INVENTORY_SLOTS: 8,
  INTERACT_DISTANCE: 2.0,
  HIDDEN_CLUE_FLASHLIGHT_DISTANCE: 2.0,

  // Nín thở khi trốn
  HOLD_BREATH_MAX_SECONDS: 6.0,
  BREATH_RECOVER_SECONDS: 3.0,
  HIDE_SAFE_DISTANCE: 6.0,
  HIDE_PEEK_MAX_YAW_DEG: 32,
  HIDE_PEEK_MAX_PITCH_DEG: 22,

  // Ma & Tension
  TENSION_MIN: 0,
  TENSION_MAX: 100,
  TENSION_SPRINT_PER_SEC: 3,
  TENSION_LIGHT_NEAR_GHOST_PER_SEC: 4,
  TENSION_DARKNESS_PER_SEC: 1,
  TENSION_DARKNESS_DELAY: 20,
  TENSION_WRONG_PIN: 10,
  TENSION_SCARE_EVENT: 15,
  TENSION_DECAY_NORMAL_PER_SEC: 1,
  TENSION_DECAY_SAFE_PER_SEC: 5,
  TENSION_SCARE_THRESHOLD: 30,
  TENSION_STALK_THRESHOLD: 60,
  TENSION_CHASE_THRESHOLD: 85,
  MAJOR_EVENT_COOLDOWN_SEC: 45,

  // Thông số di chuyển & phát hiện của ma
  GHOST_RADIUS: 0.28,
  GHOST_HEIGHT: 2.1,
  GHOST_STALK_SPEED: 1.2,
  GHOST_CHASE_SPEED: 3.4,
  GHOST_SEARCH_SPEED: 1.65,
  GHOST_SIGHT_RANGE: 10,
  GHOST_SIGHT_ANGLE_DEG: 90,
  GHOST_FLASHLIGHT_SIGHT_RANGE: 14,
  GHOST_HEAR_SPRINT: 12,
  GHOST_HEAR_WALK: 5,
  GHOST_HEAR_CROUCH: 2,
  GHOST_DETECT_FILL_SEC: 1.2,
  GHOST_DETECT_DECAY_SEC: 2.0,
  GHOST_LOSE_SIGHT_SEC: 5.0,
  GHOST_MAX_CHASE_SEC: 25.0,
  GHOST_STALK_DURATION_SEC: 22.0,
  GHOST_SEARCH_DURATION_SEC: 10.0,
  GHOST_SCARE_DURATION_SEC: 2.6,
  GHOST_COOLDOWN_DURATION_SEC: 18.0,
  GHOST_CATCH_DISTANCE: 1.0,
  GHOST_MAX_CAUGHT: 3,
  GHOST_CAUGHT_TENSION_RESET: 25,
  GHOST_CAUGHT_BLACKOUT_SEC: 2.2,
  GHOST_STUN_DISTANCE: 8.0,
  GHOST_STUN_ANGLE_DEG: 15,
  GHOST_STUN_HOLD_SEC: 1.0,
  GHOST_STUN_DURATION_SEC: 2.5,
  GHOST_STUN_COOLDOWN_SEC: 40,
  GHOST_RESPAWN_STUCK_SEC: 8.0,
  GHOST_HIDE_CHECK_CHANCE: 0.45,
  GHOST_HIDE_CHECK_RADIUS: 2.4,
  GHOST_FLICKER_RADIUS: 10.0,
  GHOST_HEARTBEAT_RADIUS: 14.0,
  GHOST_LIGHT_TENSION_RADIUS: 12.0,
  GHOST_WAYPOINT_REACH_DIST: 0.45,

  // Âm thanh môi trường định kỳ (giây)
  AMBIENT_CREAK_MIN_SEC: 9.0,
  AMBIENT_CREAK_MAX_SEC: 19.0,
  AMBIENT_WIND_MIN_SEC: 12.0,
  AMBIENT_WIND_MAX_SEC: 24.0,

  // Mật mã
  STUDY_DRAWER_CODE: '0317',
  MAIN_DOOR_CODE: '5821',

  // Hiệu ứng hậu kỳ, sương mù bụi & rung màn hình (Giai đoạn 5)
  POST_GRAIN_BASE: 0.045,
  POST_GRAIN_TENSION: 0.055,
  POST_VIGNETTE_BASE: 0.42,
  POST_VIGNETTE_TENSION: 0.25,
  POST_CA_BASE: 0.0012,
  POST_CA_TENSION: 0.0032,
  SHAKE_SCARE_INTENSITY: 0.045,
  SHAKE_CAUGHT_INTENSITY: 0.09,
  AMBIENT_WHISPER_MIN_SEC: 16.0,
  AMBIENT_WHISPER_MAX_SEC: 30.0,

  // Hiệu năng & Chất lượng đồ họa
  MAX_ACTIVE_POINT_LIGHTS: 4,
  AUTO_DOWNGRADE_FPS: 40,
  AUTO_DOWNGRADE_DURATION_SEC: 5.0,
  QUALITY_PRESETS: {
    [QualityLevel.Low]: {
      label: 'Thấp',
      pixelRatioMax: 1.0,
      shadows: false,
      shadowMapSize: 512,
    },
    [QualityLevel.Medium]: {
      label: 'Trung',
      pixelRatioMax: 1.5,
      shadows: true,
      shadowMapSize: 1024,
    },
    [QualityLevel.High]: {
      label: 'Cao',
      pixelRatioMax: 2.0,
      shadows: true,
      shadowMapSize: 2048,
    },
  },
} as const;

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  sprint: 'ShiftLeft',
  crouch: 'KeyC',
  flashlight: 'KeyF',
  interact: 'KeyE',
  holdBreath: 'KeyH',
  inventory: 'KeyI',
  journal: 'KeyJ',
};

export const KEY_ACTION_LABELS: Record<KeyAction, string> = {
  moveForward: 'Tiến lên',
  moveBackward: 'Lùi lại',
  moveLeft: 'Sang trái',
  moveRight: 'Sang phải',
  sprint: 'Chạy nhanh',
  crouch: 'Cúi thấp',
  flashlight: 'Bật / Tắt đèn pin',
  interact: 'Tương tác',
  holdBreath: 'Giữ hơi thở (khi trốn)',
  inventory: 'Mở túi đồ',
  journal: 'Mở nhật ký',
};

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.65,
  sfxVolume: 0.85,
  mouseSensitivity: 1.0,
  quality: QualityLevel.Medium,
  reduceFlash: false,
  showSubtitles: true,
  keyBindings: { ...DEFAULT_KEY_BINDINGS },
};

export const ACHIEVEMENT_METADATA: Record<
  AchievementId,
  { title: string; description: string }
> = {
  first_escape: {
    title: 'Bước ra khỏi bóng tối',
    description: 'Thoát khỏi căn nhà qua cửa chính lần đầu tiên.',
  },
  truth_seeker: {
    title: 'Người giải thoát',
    description: 'Đạt Kết thúc B với đủ 10 tài liệu chính và 3 di vật trên bàn thờ.',
  },
  flash_stunner: {
    title: 'Ánh sáng chói lòa',
    description: 'Dùng đèn pin chiếu thẳng khiến Cái Bóng khựng lại.',
  },
  silent_breath: {
    title: 'Im lặng tuyệt đối',
    description: 'Nín thở trong chỗ trốn và vượt qua lượt kiểm tra của Cái Bóng.',
  },
  collector_all: {
    title: 'Nhà lưu trữ',
    description: 'Thu thập trọn bộ 10 tài liệu chính và 3 ghi chú phụ.',
  },
  cursed_curiosity: {
    title: 'Giá của sự tò mò',
    description: 'Mang theo Búp bê sứ thoát khỏi căn nhà (Kết thúc C).',
  },
};

export const ENDING_METADATA: Record<
  EndingId,
  { title: string; subtitle: string; description: string; hint: string }
> = {
  [EndingId.A]: {
    title: 'Kết thúc A: Thoát thân',
    subtitle: 'Sống sót trước bình minh',
    description:
      'Bạn mở được cánh cửa chính nặng nề và lao ra khỏi màn đêm đặc quánh. Sau lưng bạn, căn nhà vẫn im lìm như chưa từng có chuyện gì xảy ra.',
    hint: 'Tìm đủ 10 tài liệu và đặt 3 di vật lên bàn thờ để mở Kết thúc B.',
  },
  [EndingId.B]: {
    title: 'Kết thúc B: Sự thật',
    subtitle: 'Linh hồn được siêu thoát',
    description:
      'Với toàn bộ ký ức và di vật của mẹ con bà Lan được đặt ngay ngắn trên bàn thờ, tiếng khóc trong bóng tối dịu dần rồi tan biến. Bạn bước ra ngoài khi ánh bình minh đầu tiên ló dạng.',
    hint: 'Thử chạm vào con búp bê sứ trên bàn thờ để biết cái giá của sự tò mò (Kết thúc C).',
  },
  [EndingId.C]: {
    title: 'Kết thúc C: Lời nguyền',
    subtitle: 'Thứ gì đó đã theo bạn về',
    description:
      'Bạn thoát được ra khỏi căn nhà, nhưng bàn tay lạnh buốt của con búp bê sứ vẫn bám chặt trong túi. Trong gương chiếu hậu, đôi mắt sứ khẽ chớp.',
    hint: 'Đừng nhặt búp bê sứ và tìm đủ di vật để đạt Kết thúc B.',
  },
  [EndingId.D]: {
    title: 'Kết thúc D: Bị bắt',
    subtitle: 'Không thể tỉnh dậy lần nữa',
    description:
      'Lần thứ ba bóng tối nuốt chửng bạn, không còn hơi ấm nào đưa bạn trở về căn phòng ngủ nữa. Căn nhà lại đón thêm một người ở lại mãi mãi.',
    hint: 'Sử dụng tủ trốn, giữ hơi thở bằng phím H và tắt đèn khi nghe tiếng bước chân.',
  },
  [EndingId.E]: {
    title: 'Kết thúc E: Bình minh',
    subtitle: '06:00 — Quá muộn',
    description:
      'Đồng hồ điểm 6 giờ sáng, nhưng ánh mặt trời không bao giờ rọi vào được bên trong cánh cửa khóa chặt. Căn nhà khép lại một đêm dài vô tận.',
    hint: 'Giải nhanh chuỗi cầu dao tầng hầm và mật mã cửa chính trước 06:00.',
  },
};
