import eventBus from './EventBus.js';

// Camera & Tracking (singletons — import to register them)
import cameraManager from '../camera/CameraManager.js';
import handTracker from '../tracking/HandTracker.js';
import handVisualizer from '../tracking/HandVisualizer.js';

// Gestures
import GestureEngine from '../gestures/GestureEngine.js';

// Scene
import SceneManager from '../scene/SceneManager.js';
import ObjectManager from '../scene/ObjectManager.js';

// Interaction
import InteractionManager from '../interaction/InteractionManager.js';

// UI
import SideMenu from '../ui/SideMenu.js';
import MenuPointer from '../ui/MenuPointer.js';
import HUD from '../ui/HUD.js';

// Persistence
import ProjectManager from '../persistence/ProjectManager.js';

// Debug
import gestureLogger from '../utils/GestureLogger.js';

export default class App {
  constructor() {
    this.sceneManager = null;
    this.objectManager = null;
    this.gestureEngine = null;
    this.interactionManager = null;
    this.sideMenu = null;
    this.menuPointer = null;
    this.hud = null;
    this.projectManager = null;
  }

  async init() {
    console.log('Magic Hands — Initializing...');

    // 1. Initialize Three.js scene (must be first — creates scene/camera/renderer)
    this.sceneManager = new SceneManager();
    this.sceneManager.init();

    // 2. Initialize object manager (needs the scene)
    this.objectManager = new ObjectManager(this.sceneManager.getScene());

    // 3. Register object update in the render loop
    this.sceneManager.onUpdate((time) => {
      this.objectManager.update(time);
    });

    // 4. Initialize gesture engine
    this.gestureEngine = new GestureEngine();
    this.gestureEngine.init();

    // 5. Initialize interaction manager (needs objectManager and sceneManager)
    this.interactionManager = new InteractionManager(this.objectManager, this.sceneManager);
    this.interactionManager.init();

    // 6. Initialize UI
    this.sideMenu = new SideMenu();
    this.sideMenu.init();

    this.menuPointer = new MenuPointer(this.sideMenu);
    this.menuPointer.init();

    this.hud = new HUD();
    this.hud.init();

    // 7. Initialize persistence (ProjectManager requires init() to bind events)
    this.projectManager = new ProjectManager(this.objectManager);
    this.projectManager.init();

    // Wire the "load" action in SideMenu to show the project list
    eventBus.on('menu:select', ({ item }) => {
      if (item === 'load') {
        const projects = this.projectManager.listProjects();
        this.sideMenu.showProjectList(projects);
      }
    });

    // 8. Gesture logger for debugging rotation
    gestureLogger.init();

    // 9. Start camera (triggers the whole tracking pipeline: camera → hand tracking → gestures)
    await cameraManager.init();

    console.log('Magic Hands — Ready!');
  }
}
