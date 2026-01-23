import { useEffect } from 'react';
import { logger } from '@/utils/logger';

function App() {
  useEffect(() => {
    logger.info('Application starting', {
      component: 'App',
      environment: import.meta.env.MODE,
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>First Cat In Space Platformer</h1>
        <p>Game Editor</p>
      </header>
    </div>
  );
}

export default App;
