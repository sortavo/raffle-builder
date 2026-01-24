// @sortavo/sdk/react-native - React Native specific bindings
// This module re-exports everything from React and adds RN-specific utilities

export * from '../react';

// React Native specific utilities
export { createReactNativeStorage, useDeepLinkTenant } from './utils';
