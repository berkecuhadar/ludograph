import { strings } from './lib/strings';

export function App() {
  return (
    <main className="shell">
      <h1>{strings.app.name}</h1>
      <p>{strings.app.tagline}</p>
    </main>
  );
}
