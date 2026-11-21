import { ItemCategory, ItemDef, RoomId } from '../types';

// Dữ liệu toàn bộ vật phẩm trong game theo mục 5 của đặc tả

export const ITEM_DEFS: Record<string, ItemDef> = {
  flashlight: {
    id: 'flashlight',
    name: 'Đèn pin cũ',
    description: 'Chiếc đèn pin kim loại dùng để soi đường trong bóng tối. Nhấn F để bật/tắt.',
    category: ItemCategory.Tool,
    stackable: false,
  },
  battery: {
    id: 'battery',
    name: 'Pin dự phòng',
    description: 'Viên pin tiểu còn điện. Dùng hoặc kết hợp với đèn pin để nạp thêm +60% năng lượng.',
    category: ItemCategory.Battery,
    stackable: true,
  },
  study_key: {
    id: 'study_key',
    name: 'Chìa phòng làm việc',
    description: 'Chìa khóa đồng nhỏ có khắc chữ “Làm việc”, mở cửa phòng trên tầng 2.',
    category: ItemCategory.Quest,
    stackable: false,
  },
  basement_key: {
    id: 'basement_key',
    name: 'Chìa tầng hầm',
    description: 'Chìa khóa sắt nặng mùi ẩm mốc, dùng để mở cửa xuống cầu thang tầng hầm.',
    category: ItemCategory.Quest,
    stackable: false,
  },
  fuse: {
    id: 'fuse',
    name: 'Cầu chì',
    description: 'Ống cầu chì còn nguyên vẹn. Cần lắp vào hộp cầu dao ở Phòng điện tầng hầm.',
    category: ItemCategory.Quest,
    stackable: false,
  },
  main_door_key: {
    id: 'main_door_key',
    name: 'Chìa cửa chính',
    description: 'Chìa khóa lớn mở khóa cơ của cửa ra vào chính tại phòng khách.',
    category: ItemCategory.Quest,
    stackable: false,
  },
  cursed_doll: {
    id: 'cursed_doll',
    name: 'Búp bê sứ',
    description: 'Con búp bê sứ cũ nứt nhẹ ở khóe mắt. Khi cầm lên, cảm giác lạnh buốt lan dọc cánh tay.',
    category: ItemCategory.Cursed,
    stackable: false,
  },
  music_box: {
    id: 'music_box',
    name: 'Hộp nhạc',
    description: 'Chiếc hộp nhạc gỗ nhỏ của bé Mai, nắp khắc vài nốt nhạc đã phai. Một trong ba di vật.',
    category: ItemCategory.Relic,
    stackable: false,
  },
  bracelet: {
    id: 'bracelet',
    name: 'Vòng tay bạc',
    description: 'Chiếc vòng tay bạc mảnh của bà Lan, mặt trong khắc chữ “Mãi bên nhau”. Một trong ba di vật.',
    category: ItemCategory.Relic,
    stackable: false,
  },
  family_photo: {
    id: 'family_photo',
    name: 'Khung ảnh gia đình',
    description: 'Tấm ảnh cũ chụp ông Hạ, bà Lan và bé Mai trước hiên nhà năm 2019. Một trong ba di vật.',
    category: ItemCategory.Relic,
    stackable: false,
  },
};

export interface WorldPickupDef {
  id: string;
  itemId: string;
  roomId: RoomId;
  x: number;
  y: number;
  z: number;
  label: string;
  requiresDrawerOpen?: string;
  requiresCrouchHint?: boolean;
  visualKind: 'flashlight' | 'battery' | 'key' | 'fuse' | 'doll' | 'music_box' | 'bracelet' | 'photo';
  docOnPickup?: string;
}

// Vị trí các vật phẩm nhặt trực tiếp trong căn nhà (vật phẩm trong ngăn kéo sẽ cấp khi mở ngăn kéo hoặc hiện bên trong)
export const WORLD_PICKUPS: WorldPickupDef[] = [
  // Pin 1: tủ quần áo phòng ngủ
  {
    id: 'pickup_bat_bedroom',
    itemId: 'battery',
    roomId: 'bedroom',
    x: 1.25,
    y: 0.95,
    z: 3.9,
    label: 'Pin dự phòng (tủ quần áo)',
    visualKind: 'battery',
  },
  // Pin 2: kho nhỏ tầng 1
  {
    id: 'pickup_bat_small_stor',
    itemId: 'battery',
    roomId: 'small_storage',
    x: 1.0,
    y: 0.88,
    z: 11.1,
    label: 'Pin dự phòng',
    visualKind: 'battery',
  },
  // Pin 4: kho đồ tầng 2
  {
    id: 'pickup_bat_storage_2f',
    itemId: 'battery',
    roomId: 'storage_2f',
    x: 12.15,
    y: 3.86,
    z: 10.75,
    label: 'Pin dự phòng',
    visualKind: 'battery',
  },
  // Pin 5: phòng điện tầng hầm
  {
    id: 'pickup_bat_electrical',
    itemId: 'battery',
    roomId: 'electrical_room',
    x: 8.5,
    y: -2.18,
    z: 2.5,
    label: 'Pin dự phòng',
    visualKind: 'battery',
  },
  // Di vật 1: Hộp nhạc dưới gầm giường phòng ngủ
  {
    id: 'pickup_music_box',
    itemId: 'music_box',
    roomId: 'bedroom',
    x: 1.45,
    y: 0.08,
    z: 1.55,
    label: 'Hộp nhạc (dưới gầm giường)',
    requiresCrouchHint: true,
    visualKind: 'music_box',
  },
  // Di vật 2: Vòng tay trong kho nhỏ tầng 1
  {
    id: 'pickup_bracelet',
    itemId: 'bracelet',
    roomId: 'small_storage',
    x: 0.72,
    y: 0.76,
    z: 6.2,
    label: 'Vòng tay bạc',
    visualKind: 'bracelet',
  },
  // Di vật 3: Khung ảnh gia đình trên lò sưởi phòng khách
  {
    id: 'pickup_family_photo',
    itemId: 'family_photo',
    roomId: 'living_room',
    x: 14.0,
    y: 1.65,
    z: 6.35,
    label: 'Khung ảnh gia đình',
    visualKind: 'photo',
    docOnPickup: 'doc_02_family_photo',
  },
  // Chìa cửa chính trên bàn thờ phòng nghi lễ
  {
    id: 'pickup_main_door_key',
    itemId: 'main_door_key',
    roomId: 'ritual_room',
    x: 5.4,
    y: -1.94,
    z: 8.75,
    label: 'Chìa cửa chính',
    visualKind: 'key',
  },
  // Búp bê sứ trên bàn thờ phòng nghi lễ
  {
    id: 'pickup_cursed_doll',
    itemId: 'cursed_doll',
    roomId: 'ritual_room',
    x: 5.5,
    y: -1.94,
    z: 9.35,
    label: 'Búp bê sứ',
    visualKind: 'doll',
  },
];
