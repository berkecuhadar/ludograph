import { createContext, useContext } from 'react';
import type { Display } from '../views/display';

const EMPTY: Pick<Display, 'dimmed' | 'deferred'> = {
  dimmed: new Set<string>(),
  deferred: new Set<string>(),
};

// Lets node cards know whether they are faded or deferred without rebuilding the nodes.
export const DisplayContext = createContext(EMPTY);

export const useNodeDisplay = (id: string) => {
  const { dimmed, deferred } = useContext(DisplayContext);
  return { dimmed: dimmed.has(id), deferred: deferred.has(id) };
};
