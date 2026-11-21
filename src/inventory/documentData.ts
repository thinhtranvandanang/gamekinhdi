import { DocumentDef, RoomId } from '../types';

// Dữ liệu 10 tài liệu cốt truyện (60-100 từ tiếng Việt, giọng u ám) theo mục 6 của đặc tả

export const DOCUMENTS: DocumentDef[] = [
  {
    id: 'doc_01_bedroom_note',
    title: 'Tờ nhắn đầu giường',
    locationLabel: 'Phòng ngủ · Tầng 1',
    content:
      'Nếu anh đọc được tờ giấy này lúc nửa đêm, xin đừng bước ra khỏi phòng ngủ sau 3 giờ sáng. Cứ ở yên bên trong cho đến khi trời hửng nắng. Tôi đã dán lại lá bùa cũ trên khung cửa gỗ; dù giấy đã rách góc, nó vẫn còn giữ được ranh giới cho căn phòng này. Đừng tin tiếng gõ cửa hay giọng gọi tên mình ngoài hành lang. Ở đây chỉ còn bóng tối đang chờ người mở cửa.',
  },
  {
    id: 'doc_02_family_photo',
    title: 'Mặt sau khung ảnh gia đình',
    locationLabel: 'Phòng khách · Tầng 1',
    content:
      'Nét mực xanh đã nhòe đi vì ẩm mốc: “Gia đình nhỏ của mình — Hạ, Lan và bé Mai. Chụp trước hiên nhà mùa thu năm 2019, hai tháng trước khi Lan qua đời.” Phía dưới góc ảnh có thêm một dòng viết vội bằng bút chì run rẩy: “Con bé Mai nói vẫn nghe thấy mẹ hát ru dưới cầu thang. Tôi phải tìm cách đưa Lan trở về, dù chỉ một lần nói chuyện cuối cùng.”',
  },
  {
    id: 'doc_03_old_newspaper',
    title: 'Tờ báo cũ & lời nhắn chủ nhà',
    locationLabel: 'Kho nhỏ · Tầng 1',
    content:
      'Mẩu báo cắt từ năm 2021 đưa tin vụ mất tích bí ẩn của hai cha con ông Trần Văn Hạ; căn nhà bị bỏ hoang suốt nhiều năm, không ai dám ở quá một đêm. Kẹp bên trong là tờ giấy nhắn gửi cho bạn: “Nhờ cậu dọn giúp ít đồ cũ rồi ngủ lại trông nhà một đêm, sáng mai tôi ghé thanh toán. Cửa chính dạo này kẹt khóa điện từ, đừng đi lung tung ban đêm.”',
  },
  {
    id: 'doc_04_electric_bill',
    title: 'Hóa đơn tiền điện',
    locationLabel: 'Nhà bếp · Tầng 1',
    content:
      'Biên lai thu tiền điện nhà ở đã ố vàng và rách mép. Địa chỉ ghi rõ: Số nhà 58, ngõ Trúc cũ, chủ hộ Trần Văn Hạ. Dòng đóng dấu đỏ ở cuối trang thông báo: “Ngừng cung cấp điện lưới toàn bộ ngôi nhà do quá hạn nhiều kỳ.” Phía sau tờ hóa đơn có dòng chữ nguệch ngoạc: “Nếu cầu dao tầng hầm nhảy lần nữa, nhớ kiểm tra ống cầu chì dự phòng trong kho trên gác.”',
  },
  {
    id: 'doc_05_ha_diary_1',
    title: 'Nhật ký ông Hạ (Trang 1)',
    locationLabel: 'Phòng làm việc · Tầng 2',
    content:
      'Đêm nào tôi cũng ngồi nhìn kim đồng hồ phòng khách nhích từng nhịp trong im lặng. Từ ngày Lan mất, căn nhà rộng đến mức tiếng thở của chính mình cũng dội lại. Đêm nay tôi đã chuẩn bị xong vòng vẽ dưới tầng hầm. Đúng 03 giờ 17 phút, lúc mọi ranh giới mỏng manh nhất, chiếc đồng hồ treo tường bỗng khựng lại hẳn. Nghi lễ bắt đầu, và không khí trong phòng lạnh đi tức khắc.',
  },
  {
    id: 'doc_06_ha_diary_2',
    title: 'Nhật ký ông Hạ (Trang 2)',
    locationLabel: 'Phòng làm việc · Tầng 2',
    content:
      'Tôi đã phạm sai lầm không thể cứu vãn. Thứ đáp lại lời gọi từ bóng tối đêm đó không phải Lan. Nó chỉ mượn giọng nói của vợ tôi để dụ tôi mở đường lên tầng trên, rồi giữ chặt linh hồn bé Mai lại trong căn nhà này. Tôi đổi mật mã khóa phụ cửa chính để nhốt nó lại bên trong: số nhà cũ, rồi đến ngày sinh của Mai. Tôi không thể rời đi khi con gái vẫn còn kẹt ở đây.',
  },
  {
    id: 'doc_07_mai_drawing',
    title: 'Bức tranh vẽ của bé Mai',
    locationLabel: 'Kho đồ · Tầng 2',
    content:
      'Trên tờ giấy vẽ nhàu nát là hình một căn nhà tối màu và ba dáng người đứng cạnh nhau, nhưng một bóng đen cao lênh khênh đứng đè lên tất cả. Bên dưới có dòng chữ trẻ con viết nắn nót: “Ba ơi đừng làm nữa, mẹ không có ở dưới đó đâu.” (Khi soi đèn pin thật gần ở góc phải bức tranh, bạn thấy con số “21” viết bằng sáp đỏ ẩn dưới lớp bụi mờ.)',
    hiddenHint: '21',
  },
  {
    id: 'doc_08_breaker_note',
    title: 'Hướng dẫn hộp cầu dao',
    locationLabel: 'Phòng điện · Tầng hầm',
    content:
      'Tờ hướng dẫn dán cạnh bảng điện đã bong tróc một nửa: “Bước 1: Lắp cầu chì mới vào khe giữa. Bước 2: Gạt cần đỏ lên trên để cấp điện lại cho toàn bộ tầng hầm và bộ khóa điện từ của cửa chính.” Xung quanh mép tường bê tông gần hộp cầu dao hằn rõ những vết tay nhỏ kéo dài xuống nền đất, như thể có ai đó từng cố bám lại trong bóng tối.',
  },
  {
    id: 'doc_09_altar_warning',
    title: 'Mảnh giấy cảnh báo trước bàn thờ',
    locationLabel: 'Phòng nghi lễ · Tầng hầm',
    content:
      'Một mảnh giấy nhàu nát bị ghim chặt xuống mép gỗ bàn thờ bằng cây kim gỉ sét. Chỉ có vài dòng chữ viết vội bằng mực đỏ sẫm, nét bút hằn sâu đến mức rách cả mặt giấy: “ĐỪNG CHẠM VÀO BÚP BÊ. Thứ trú ngụ trong con búp bê sứ đó đang tìm người mang nó ra khỏi ngưỡng cửa. Nếu mang nó theo lúc thoát thân, cánh cửa sẽ không bao giờ thả ngươi đi thật sự.”',
  },
  {
    id: 'doc_10_ha_diary_last',
    title: 'Trang cuối nhật ký ông Hạ',
    locationLabel: 'Phòng nghi lễ · Tầng hầm',
    content:
      'Tôi không còn đủ sức cầm đèn nữa. Bóng tối dưới tầng hầm đang nuốt dần mọi thứ, nhưng ít ra tôi đã biết cách để bé Mai được tự do. Nếu ai đó tìm thấy trang giấy này, xin đừng chỉ lo chạy thoát thân. Hãy tìm lại ba món di vật còn vương lại của Lan và Mai — hộp nhạc, vòng tay bạc và khung ảnh gia đình — rồi đặt cả ba lên bàn thờ này để hóa giải lời nguyền.',
  },
];

// 3 ghi chú phụ mở rộng cốt truyện (không ảnh hưởng điều kiện 10/10 tài liệu của Kết thúc B)
export const SIDE_DOCUMENTS: DocumentDef[] = [
  {
    id: 'sdoc_01_plumber_receipt',
    title: 'Biên lai sửa ống nước (Phụ)',
    locationLabel: 'Hành lang · Tầng 1',
    isSideNote: true,
    content:
      'Tờ giấy biên lai nhàu nát rơi sát chân tường hành lang: “Ngày 12/04/2021 — Sửa đường ống rò rỉ dưới tầng hầm nhà số 58. Chủ nhà yêu cầu thợ không được bước vào căn phòng cuối hành lang phía tây và phải hoàn thành công việc trước 5 giờ chiều.” Ở mặt sau có ghi thêm bằng bút bi: “Nghe tiếng trẻ con gõ cửa từ trong phòng kín, tôi xin trả lại tiền cọc và không quay lại nữa.”',
  },
  {
    id: 'sdoc_02_mai_certificate',
    title: 'Phiếu bé ngoan của bé Mai (Phụ)',
    locationLabel: 'Phòng khách · Tầng 1',
    isSideNote: true,
    content:
      'Tấm bìa màu hồng nhạt đã phai mực nằm dưới bàn trà phòng khách: “Cháu Trần Ngọc Mai — Lớp Chồi 2 — Bé ngoan, hay hát và thích nghe hộp nhạc gỗ.” Kẹp phía sau là bức thư nhỏ chưa kịp gửi cho cô giáo: “Xin phép cho Mai nghỉ học một tuần vì cháu hay thức dậy lúc 3 giờ sáng nói chuyện với mẹ trong bóng tối.”',
  },
  {
    id: 'sdoc_03_electrician_log',
    title: 'Ghi chú thợ điện bỏ việc (Phụ)',
    locationLabel: 'Hành lang · Tầng 2',
    isSideNote: true,
    content:
      'Mảnh sổ tay rách gáy: “Hệ thống dây dẫn nhà này nối thẳng từ phòng điện tầng hầm lên khóa từ cửa chính. Lạ một điều là dù đã ngắt cầu dao tổng, đèn ở gian phòng ngủ tầng 1 vẫn luôn hắt ánh sáng yếu ớt như có thứ gì đó không muốn bóng tối bước qua cánh cửa đó.”',
  },
];

export const ALL_DOCUMENTS: DocumentDef[] = [...DOCUMENTS, ...SIDE_DOCUMENTS];

export const DOCUMENT_MAP = new Map<string, DocumentDef>(ALL_DOCUMENTS.map((d) => [d.id, d]));

export interface WorldDocumentPickupDef {
  id: string;
  docId: string;
  roomId: RoomId;
  x: number;
  y: number;
  z: number;
  label: string;
}

// Vị trí các tài liệu nằm trực tiếp trong thế giới (các tài liệu khác nằm trong ngăn kéo hoặc gắn với tranh/ảnh)
export const WORLD_DOCUMENT_PICKUPS: WorldDocumentPickupDef[] = [
  {
    id: 'wdoc_01_bedroom',
    docId: 'doc_01_bedroom_note',
    roomId: 'bedroom',
    x: 2.38,
    y: 0.67,
    z: 0.6,
    label: 'Tờ nhắn đầu giường',
  },
  {
    id: 'wdoc_03_newspaper',
    docId: 'doc_03_old_newspaper',
    roomId: 'small_storage',
    x: 3.8,
    y: 0.92,
    z: 10.9,
    label: 'Tờ báo cũ & lời nhắn',
  },
  {
    id: 'wdoc_05_diary1',
    docId: 'doc_05_ha_diary_1',
    roomId: 'study_2f',
    x: 10.8,
    y: 3.8,
    z: 3.2,
    label: 'Nhật ký ông Hạ (Trang 1)',
  },
  {
    id: 'wdoc_06_diary2',
    docId: 'doc_06_ha_diary_2',
    roomId: 'study_2f',
    x: 12.25,
    y: 4.15,
    z: 5.7,
    label: 'Nhật ký ông Hạ (Trang 2)',
  },
  {
    id: 'wdoc_08_breaker_note',
    docId: 'doc_08_breaker_note',
    roomId: 'electrical_room',
    x: 4.35,
    y: -1.75,
    z: 3.2,
    label: 'Hướng dẫn cầu dao',
  },
  {
    id: 'wdoc_09_altar_warning',
    docId: 'doc_09_altar_warning',
    roomId: 'ritual_room',
    x: 5.55,
    y: -1.94,
    z: 8.2,
    label: 'Cảnh báo trước bàn thờ',
  },
  {
    id: 'wdoc_10_diary_last',
    docId: 'doc_10_ha_diary_last',
    roomId: 'ritual_room',
    x: 5.35,
    y: -1.94,
    z: 9.8,
    label: 'Trang cuối nhật ký ông Hạ',
  },
  {
    id: 'wsdoc_01_plumber',
    docId: 'sdoc_01_plumber_receipt',
    roomId: 'hallway_1f',
    x: 7.45,
    y: 0.03,
    z: 2.1,
    label: 'Biên lai sửa ống nước',
  },
  {
    id: 'wsdoc_02_mai_cert',
    docId: 'sdoc_02_mai_certificate',
    roomId: 'living_room',
    x: 11.4,
    y: 0.48,
    z: 6.2,
    label: 'Phiếu bé ngoan của bé Mai',
  },
  {
    id: 'wsdoc_03_electrician',
    docId: 'sdoc_03_electrician_log',
    roomId: 'hallway_2f',
    x: 8.2,
    y: 3.03,
    z: 5.3,
    label: 'Ghi chú thợ điện bỏ việc',
  },
];
