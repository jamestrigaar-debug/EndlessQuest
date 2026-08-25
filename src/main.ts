import { SimulationLoop } from './core/simulation/SimulationLoop';
import { UI } from './ui/UI';

function getInitialSeed(): string {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');
  if (seedParam) return seedParam;
  return Math.floor(Math.random() * 1000000).toString();
}

async function main(): Promise<void> {
  const seed = getInitialSeed();
  console.log(`Starting EndlessQuest with seed: ${seed}`);

  const simulation = new SimulationLoop(seed);
  const appContainer = document.body;

  const ui = new UI(appContainer, simulation);
  await ui.initialize();

  (window as any).simulation = simulation;
  (window as any).ui = ui;

  const originalNewGame = simulation.newGame.bind(simulation);
  simulation.newGame = (newSeed?: string | number) => {
    originalNewGame(newSeed);
    // Re-initialize UI after new game (event bus was cleared)
    ui.initialize().then(() => {
      console.log('UI re-initialized after new game');
    });
    if (newSeed) {
      const url = new URL(window.location.href);
      url.searchParams.set('seed', newSeed.toString());
      window.history.replaceState({}, '', url.toString());
    }
  };

  console.log('EndlessQuest initialized');
}

main().catch((e) => {
  console.error('Failed to start EndlessQuest', e);
  const el = document.createElement('div');
  el.style.color = 'red';
  el.style.padding = '20px';
  el.textContent = `Failed to start: ${e}`;
  document.body.appendChild(el);
});
