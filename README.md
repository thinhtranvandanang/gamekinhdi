# Căn Nhà Lúc 3 Giờ Sáng

Trò chơi kinh dị sinh tồn góc nhìn thứ nhất xây dựng bằng **Vite + React + TypeScript + Three.js** (đồ họa và âm thanh 100% procedural, không phụ thuộc tài nguyên ngoài).

## Cách chạy

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`.
Thêm `?debug=1` vào cuối URL để bật bảng công cụ kiểm thử (Dịch chuyển phòng, Chỉnh Tension, Ép trạng thái ma/kết thúc, Noclip).

Build bản phát hành:

```bash
npm run build
```

## Điều khiển

### PC (có thể đổi phím trong mục Cài đặt)
- **W / A / S / D**: Di chuyển (hoặc phím mũi tên)
- **Chuột** (nhấp vào màn hình): Xoay góc nhìn
- **Shift**: Chạy nhanh (tiêu hao thể lực, tăng tiếng động & Tension)
- **C** hoặc **Ctrl**: Cúi thấp (giảm tiếng bước chân)
- **F**: Bật / Tắt đèn pin
- **E**: Tương tác (mở cửa, ngăn kéo, nhặt đồ, đọc tài liệu, trốn vào tủ)
- **H**: Giữ để nín thở khi trốn trong tủ
- **Tab** hoặc **I**: Mở Túi đồ
- **J**: Mở Nhật ký tài liệu
- **Esc**: Tạm dừng / Đóng giao diện

### Thiết bị cảm ứng (Mobile / Tablet)
- **Nửa trái màn hình**: Cần điều khiển ảo (đẩy sát viền ngoài để chạy nhanh).
- **Nửa phải màn hình**: Vuốt để xoay góc nhìn.
- **Nút hành động góc phải**: Tương tác, Bật/Tắt đèn pin, Cúi thấp, Giữ hơi thở (khi trốn), Túi đồ, Nhật ký, Tạm dừng.

## Cấu trúc thư mục `src/`

- `src/config.ts`: Toàn bộ hằng số cân bằng (vận tốc, pin, Tension, AI Cái Bóng, hậu kỳ, chất lượng đồ họa, phím mặc định, mô tả kết thúc & thành tựu).
- `src/types.ts`: Toàn bộ kiểu dữ liệu và enum dùng chung.
- `src/core/`: Vòng lặp 60 Hz (`Loop.ts`), bộ điều phối chính (`Game.ts`), hậu kỳ WebGL (`PostProcessing.ts`), `StateMachine.ts`, `EventBus.ts`.
- `src/world/`: Bản đồ 3 tầng (`layoutData.ts`), vật liệu CanvasTexture (`Materials.ts`), đồ nội thất (`Props.ts`), tối ưu mesh & sương bụi (`World.ts`).
- `src/player/`: Nhân vật, va chạm trượt tường (`Collision.ts`), đèn pin & chùm sáng (`Flashlight.ts`).
- `src/ghost/`: AI Cái Bóng 6 trạng thái + A* (`GhostManager.ts`), hình thể procedural (`GhostVisual.ts`).
- `src/inventory/`, `src/quest/`, `src/puzzle/`, `src/interaction/`: Túi đồ, 10 tài liệu chính + 3 ghi chú phụ, nhiệm vụ chính/phụ, mật mã & bàn thờ.
- `src/audio/`: Âm thanh Web Audio API 3D HRTF + nhạc nền drone phản ứng theo Tension (`AudioManager.ts`).
- `src/save/` & `src/endings/`: Lưu/tải tiến trình (`SaveManager.ts`), thống kê & thành tựu (`StatsManager.ts`), 5 kết thúc ưu tiên `D -> E -> C -> B -> A` (`EndingManager.ts`).
- `src/ui/`: Giao diện lớp phủ React (Menu, HUD, Túi đồ, Nhật ký, Bàn phím số, Thống kê & Thành tựu, Cài đặt, Hướng dẫn).

## Chỉnh sửa cân bằng

Toàn bộ thông số gameplay nằm tập trung trong `src/config.ts` (`GAME_CONFIG`, `DEFAULT_KEY_BINDINGS`, `ACHIEVEMENT_METADATA`, `ENDING_METADATA`). Chỉ cần sửa trực tiếp giá trị trong file này để tinh chỉnh độ khó, tốc độ tiêu hao pin, ngưỡng Tension hoặc hiệu ứng hậu kỳ.
