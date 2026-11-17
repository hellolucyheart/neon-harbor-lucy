// Deterministic ?shot= poses for screenshots: stage a scene, then freeze the framing.
import { streetCoord } from './harbor.js';

export function shotParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot'),
    seed: parseInt(q.get('seed') || '1', 10) || 1,
  };
}

// Stage one of the four named shots on the live game object.
export function stageShot(game, name) {
  const street = streetCoord(4);
  if (name === 'start') {
    game.showTitleOverCity();
    return;
  }
  game.beginPlay();
  if (name === 'drive') {
    game.placeHero(street + 2.6, streetCoord(2));
    game.giveCarAt(street + 2.6, streetCoord(2) - 6, Math.PI);
    game.driveForward();
  } else if (name === 'chase') {
    game.placeHero(street - 2.6, streetCoord(6));
    game.giveCarAt(street - 2.6, streetCoord(6) - 6, 0);
    game.driveForward();
    game.setWanted(3);
    game.stagePursuit();
  } else if (name === 'mission') {
    game.setMission(1);
    game.spawnMissionThugs();
    game.arrangeMissionShot();
  }
}
