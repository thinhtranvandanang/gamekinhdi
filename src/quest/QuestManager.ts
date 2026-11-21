import { QuestStatus, QuestSummary } from '../types';

// Quản lý chuỗi nhiệm vụ chính (mục 5) và nhiệm vụ phụ đặt 3 di vật lên bàn thờ

export type MainQuestStep =
  | 'get_flashlight'
  | 'explore_living_room'
  | 'open_study_and_drawer'
  | 'find_fuse_and_basement_key'
  | 'restore_power'
  | 'get_main_key'
  | 'unlock_main_door'
  | 'escaped';

const STEP_LABELS: Record<MainQuestStep, string> = {
  get_flashlight: 'Tìm đèn pin trong tủ đầu giường phòng ngủ',
  explore_living_room: 'Ra phòng khách tìm Chìa phòng làm việc',
  open_study_and_drawer: 'Lên tầng 2 mở Phòng làm việc và giải mã ngăn kéo bàn',
  find_fuse_and_basement_key: 'Tìm Cầu chì ở Kho đồ tầng 2 và mở cửa tầng hầm từ nhà bếp',
  restore_power: 'Xuống Phòng điện tầng hầm, lắp cầu chì và gạt cầu dao',
  get_main_key: 'Tìm Chìa cửa chính tại Phòng nghi lễ tầng hầm',
  unlock_main_door: 'Quay lại cửa chính: kiểm tra điện, chìa và mật mã (4 số) để thoát',
  escaped: 'Đã thoát khỏi căn nhà',
};

export class QuestManager {
  public mainStep: MainQuestStep = 'get_flashlight';
  public mainStatus: QuestStatus = 'in_progress';
  public sideStatus: QuestStatus = 'unaccepted';
  public relicsPlaced = 0;

  public reset(): void {
    this.mainStep = 'get_flashlight';
    this.mainStatus = 'in_progress';
    this.sideStatus = 'unaccepted';
    this.relicsPlaced = 0;
  }

  public get currentObjective(): string {
    return STEP_LABELS[this.mainStep];
  }

  public get sideObjective(): string {
    if (this.sideStatus === 'unaccepted') {
      return 'Chưa nhận nhiệm vụ phụ';
    }
    if (this.sideStatus === 'completed') {
      return 'Đã đặt đủ 3 di vật lên bàn thờ (3/3)';
    }
    return `Đặt ba di vật của bà Lan và bé Mai lên bàn thờ (${this.relicsPlaced}/3)`;
  }

  public getSummary(): QuestSummary {
    return {
      mainObjective: this.currentObjective,
      mainStatus: this.mainStatus,
      sideObjective: this.sideObjective,
      sideStatus: this.sideStatus,
      relicsPlaced: this.relicsPlaced,
    };
  }

  public advanceFromContext(params: {
    hasFlashlight: boolean;
    hasStudyKey: boolean;
    hasBasementKey: boolean;
    hasFuse: boolean;
    powerRestored: boolean;
    hasMainKey: boolean;
    escaped: boolean;
    hasAnyRelicOrNote10: boolean;
    relicsPlaced: number;
  }): void {
    this.relicsPlaced = params.relicsPlaced;

    if (params.relicsPlaced >= 3) {
      this.sideStatus = 'completed';
    } else if (params.hasAnyRelicOrNote10 || params.relicsPlaced > 0) {
      if (this.sideStatus === 'unaccepted') {
        this.sideStatus = 'in_progress';
      }
    }

    if (params.escaped) {
      this.mainStep = 'escaped';
      this.mainStatus = 'completed';
      return;
    }

    this.mainStatus = 'in_progress';

    if (!params.hasFlashlight) {
      this.mainStep = 'get_flashlight';
    } else if (!params.hasStudyKey) {
      this.mainStep = 'explore_living_room';
    } else if (!params.hasBasementKey) {
      this.mainStep = 'open_study_and_drawer';
    } else if (!params.hasFuse) {
      this.mainStep = 'find_fuse_and_basement_key';
    } else if (!params.powerRestored) {
      this.mainStep = 'restore_power';
    } else if (!params.hasMainKey) {
      this.mainStep = 'get_main_key';
    } else {
      this.mainStep = 'unlock_main_door';
    }
  }
}
