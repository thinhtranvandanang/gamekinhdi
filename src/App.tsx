import { useEffect, useRef, useState } from 'react';
import { Game } from './core/Game';
import { DEFAULT_SETTINGS } from './config';
import {
  DebugState,
  EndingId,
  EndingSummary,
  GameSettings,
  GameState,
  GhostState,
  HUDState,
  KeypadTarget,
} from './types';
import { DebugPanel } from './ui/DebugPanel';
import { EndingScreen } from './ui/EndingScreen';
import { GuideModal } from './ui/GuideModal';
import { HidingOverlay } from './ui/HidingOverlay';
import { HUD } from './ui/HUD';
import { InventoryModal } from './ui/InventoryModal';
import { JournalModal } from './ui/JournalModal';
import { KeypadModal } from './ui/KeypadModal';
import { MainMenu } from './ui/MainMenu';
import { PauseMenu } from './ui/PauseMenu';
import { SettingsModal } from './ui/SettingsModal';
import { StatsModal } from './ui/StatsModal';
import { TouchOverlay } from './ui/TouchOverlay';
import { WarningModal } from './ui/WarningModal';
import { WebGLErrorScreen } from './ui/WebGLErrorScreen';

const INITIAL_HUD: HUDState = {
  batteryPercent: 100,
  flashlightOn: false,
  hasFlashlight: false,
  staminaPercent: 100,
  isCrouching: false,
  isSprinting: false,
  isHiding: false,
  isHoldingBreath: false,
  hidingSpotLabel: null,
  breathPercent: 100,
  stunCooldownSec: 0,
  ghostDistance: 99,
  ghostState: GhostState.Dormant,
  caughtNotice: null,
  gameTimeSeconds: 0,
  formattedTime: '03:00',
  currentRoomId: 'bedroom',
  currentRoomName: 'Phòng ngủ',
  currentFloorLabel: 'Tầng 1',
  currentObjective: 'Tìm chiếc đèn pin trong phòng ngủ.',
  sideObjective: 'Đặt ba di vật của bà Lan và bé Mai lên bàn thờ',
  sideStatus: 'unaccepted',
  interactionPrompt: null,
  subtitleText: null,
  tension: 0,
  caughtCount: 0,
  fps: 60,
  pointerLocked: false,
  isTouchDevice: false,
  isLowBattery: false,
  autoQualityNote: null,
  documentsFound: 0,
  powerRestored: false,
};

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Game | null>(null);

  const [gameState, setGameState] = useState<GameState>(GameState.Warning);
  const [hud, setHud] = useState<HUDState>(INITIAL_HUD);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [hasSave, setHasSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [unlockedEndings, setUnlockedEndings] = useState<EndingId[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsTick, setStatsTick] = useState(0);
  const [endingSummary, setEndingSummary] = useState<EndingSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [keypadTarget, setKeypadTarget] = useState<KeypadTarget | null>(null);
  const [inventoryTick, setInventoryTick] = useState(0);
  const [debugState, setDebugState] = useState<DebugState>({
    enabled: false,
    noclip: false,
    showColliders: false,
    showWaypoints: false,
    showGhostDebug: false,
    fps: 60,
    tension: 0,
    gameTimeSeconds: 0,
    ghostState: GhostState.Dormant,
    caughtCount: 0,
  });

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const refreshStorageState = (g: Game) => {
      const blocked = !g.saveManager.isStorageAvailable();
      setStorageBlocked(blocked);
      const loadRes = g.saveManager.loadGame();
      setHasSave(loadRes.data !== null);
      setSaveError(blocked ? null : loadRes.error);
      setUnlockedEndings(g.saveManager.loadUnlockedEndings());
    };

    const game = new Game({
      onStateChange: (next) => {
        setGameState(next);
        refreshStorageState(game);
      },
      onHUDUpdate: (nextHud) => setHud(nextHud),
      onEnding: (summary) => {
        setEndingSummary(summary);
        setUnlockedEndings(summary.unlockedEndings);
      },
      onNotice: (msg) => {
        setNotice(msg);
      },
      onOpenDocument: (docId) => {
        setActiveDocId(docId);
      },
      onOpenKeypad: (target) => {
        setKeypadTarget(target);
      },
      onInventoryRefresh: () => {
        setInventoryTick((n) => n + 1);
      },
      onDebugUpdate: (dbg) => setDebugState(dbg),
    });

    gameRef.current = game;
    setGameState(game.stateMachine.getState());
    setSettings(game.settings);
    refreshStorageState(game);
    setDebugState((prev) => ({ ...prev, enabled: game.debugEnabled }));

    game.mount(container);

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const anySubOpen = showSettings || showGuide || showStats;
    gameRef.current?.setSubModalOpen(anySubOpen);
    if (!anySubOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        setShowSettings(false);
        setShowGuide(false);
        setShowStats(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showSettings, showGuide, showStats]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const handleToggleMute = () => {
    const g = gameRef.current;
    if (!g) return;
    g.audio.initOnGesture();
    const nextMuted = !g.audio.isMuted();
    g.audio.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  const handleUpdateSettings = (next: GameSettings) => {
    setSettings(next);
    gameRef.current?.updateSettings(next);
  };

  const game = gameRef.current;
  // Đọc snapshot túi đồ theo inventoryTick mỗi khi modal mở hoặc cập nhật
  const inventorySnapshot =
    game && inventoryTick >= 0
      ? {
          slots: game.inventory.slots.map((s) => ({ ...s })),
          questItems: Array.from(game.inventory.questItems),
          readDocIds: Array.from(game.inventory.readDocuments),
        }
      : { slots: [], questItems: [], readDocIds: [] };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#050507]">
      {/* Vùng chứa WebGL canvas cố định, tách biệt hoàn toàn khỏi cây DOM lớp phủ */}
      <div ref={canvasContainerRef} className="absolute inset-0 h-full w-full" />

      {gameState === GameState.WebGLError && <WebGLErrorScreen />}

      {gameState === GameState.Warning && (
        <WarningModal
          initialReduceFlash={settings.reduceFlash}
          onConfirm={(reduceFlash) => {
            const next = { ...settings, reduceFlash };
            handleUpdateSettings(next);
            gameRef.current?.acknowledgeWarning();
          }}
        />
      )}

      {gameState === GameState.Menu && (
        <MainMenu
          hasSave={hasSave}
          saveError={saveError}
          storageBlocked={storageBlocked}
          isMuted={isMuted}
          unlockedEndings={unlockedEndings}
          onStartNew={() => gameRef.current?.startNewGame()}
          onContinue={() => gameRef.current?.continueGame()}
          onOpenSettings={() => setShowSettings(true)}
          onOpenGuide={() => setShowGuide(true)}
          onOpenStats={() => {
            setStatsTick((n) => n + 1);
            setShowStats(true);
          }}
          onToggleMute={handleToggleMute}
        />
      )}

      {gameState === GameState.Playing && (
        <>
          <HidingOverlay hud={hud} keyBindings={settings.keyBindings} />
          <HUD
            hud={hud}
            isMuted={isMuted}
            keyBindings={settings.keyBindings}
            onToggleMute={handleToggleMute}
            onPause={() => gameRef.current?.pauseGame()}
            onLockPointer={() => gameRef.current?.lockPointerFromCanvas()}
            onOpenInventory={() => gameRef.current?.openInventory()}
            onOpenJournal={() => gameRef.current?.openJournal(null)}
          />
          {hud.isTouchDevice && game && (
            <TouchOverlay
              hud={hud}
              touchControls={game.touchControls}
              onToggleFlashlight={() => game.toggleFlashlightFromUI()}
              onToggleCrouch={() => game.toggleCrouchFromUI()}
              onInteract={() => game.triggerInteractFromUI()}
              onOpenInventory={() => game.openInventory()}
              onOpenJournal={() => game.openJournal(null)}
              onPause={() => game.pauseGame()}
            />
          )}
        </>
      )}

      {gameState === GameState.Inventory && game && (
        <InventoryModal
          slots={inventorySnapshot.slots}
          questItems={inventorySnapshot.questItems}
          batteryPercent={hud.batteryPercent}
          hasFlashlight={hud.hasFlashlight}
          flashlightOn={hud.flashlightOn}
          onUseItem={(itemId) => game.useInventoryItem(itemId)}
          onCombineItems={(a, b) => game.combineInventoryItems(a, b)}
          onDropItem={(itemId) => game.dropInventoryItem(itemId)}
          onOpenJournal={() => game.openJournal(null)}
          onClose={() => game.closeOverlayToPlaying()}
        />
      )}

      {gameState === GameState.Journal && game && (
        <JournalModal
          readDocumentIds={inventorySnapshot.readDocIds}
          initialDocId={activeDocId}
          onOpenInventory={() => game.openInventory()}
          onClose={() => game.closeOverlayToPlaying()}
        />
      )}

      {gameState === GameState.Keypad && keypadTarget && game && (
        <KeypadModal
          target={keypadTarget}
          onSubmit={(code) => game.submitKeypadCode(code)}
          onClose={() => game.closeOverlayToPlaying()}
        />
      )}

      {gameState === GameState.Paused && (
        <PauseMenu
          onResume={() => gameRef.current?.resumeGame()}
          onOpenSettings={() => setShowSettings(true)}
          onOpenGuide={() => setShowGuide(true)}
          onReturnMenu={() => gameRef.current?.returnToMenu()}
        />
      )}

      {gameState === GameState.Ending && endingSummary && (
        <EndingScreen
          summary={endingSummary}
          onPlayAgain={() => gameRef.current?.startNewGame()}
          onReturnMenu={() => gameRef.current?.returnToMenu()}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showGuide && (
        <GuideModal keyBindings={settings.keyBindings} onClose={() => setShowGuide(false)} />
      )}

      {showStats && game && statsTick >= 0 && (
        <StatsModal
          stats={game.statsManager.getSnapshot()}
          onResetStats={() => {
            game.statsManager.resetStats();
            setStatsTick((n) => n + 1);
          }}
          onClose={() => setShowStats(false)}
        />
      )}

      {debugState.enabled && gameState === GameState.Playing && (
        <DebugPanel
          debug={debugState}
          onToggleNoclip={(enabled) => gameRef.current?.debugSetNoclip(enabled)}
          onTeleport={(roomId) => gameRef.current?.debugTeleportToRoom(roomId)}
          onSetTime={(sec) => gameRef.current?.debugSetGameTime(sec)}
          onSetTension={(val) => gameRef.current?.debugSetTension(val)}
          onTriggerGhost={(st) => gameRef.current?.debugTriggerGhostState(st)}
          onTriggerScriptedEvent={(id) => gameRef.current?.debugTriggerScriptedEvent(id)}
          onToggleVisuals={(col, wp, ghostDbg) =>
            gameRef.current?.debugToggleVisuals(col, wp, ghostDbg)
          }
          onGiveAllItems={() => gameRef.current?.debugGiveAllItems()}
          onSolveAllPuzzles={() => gameRef.current?.debugSolveAllPuzzles()}
          onJumpNearEnd={() => gameRef.current?.debugJumpNearEnd()}
          onForceEnding={(id) => gameRef.current?.debugForceEnding(id)}
        />
      )}

      {notice && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border border-red-900/70 bg-[#0d0d12]/95 px-4 py-2 text-xs text-red-100 shadow-lg">
          {notice}
        </div>
      )}
    </div>
  );
}

