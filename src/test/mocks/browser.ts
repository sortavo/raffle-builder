import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Setup MSW worker for browser (Storybook, dev mode)
export const worker = setupWorker(...handlers);
