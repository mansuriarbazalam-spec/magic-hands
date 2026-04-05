import App from './core/App.js';

const app = new App();
app.init().catch(err => {
  console.error('Magic Hands failed to initialize:', err);
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#00d4ff;font-family:monospace;text-align:center;padding:20px;">
      <div>
        <h1>Magic Hands</h1>
        <p>Failed to initialize. Please ensure:</p>
        <ul style="text-align:left;display:inline-block;">
          <li>Camera permissions are granted</li>
          <li>You're using a modern browser (Chrome/Edge recommended)</li>
          <li>WebGL is supported</li>
        </ul>
        <p style="color:#ff4444;margin-top:20px;">${err.message}</p>
      </div>
    </div>
  `;
});
