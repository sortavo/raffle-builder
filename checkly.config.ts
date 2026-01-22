import { defineConfig } from 'checkly';
import { Frequency } from 'checkly/constructs';

export default defineConfig({
  projectName: 'Sortavo',
  logicalId: 'sortavo-monitoring',
  repoUrl: 'https://github.com/sortavo/raffle-builder',
  checks: {
    activated: true,
    muted: false,
    runtimeId: '2024.02',
    frequency: Frequency.EVERY_5M,
    locations: ['us-east-1', 'us-west-1'],
    tags: ['production', 'sortavo'],
    checkMatch: '**/__checks__/**/*.check.ts',
    browserChecks: {
      frequency: Frequency.EVERY_10M,
      testMatch: '**/__checks__/**/*.spec.ts',
    },
  },
  cli: {
    runLocation: 'us-east-1',
  },
});
