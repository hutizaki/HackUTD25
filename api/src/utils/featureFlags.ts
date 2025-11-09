import { FeatureFlag } from '../models/FeatureFlag';

/**
 * Check if a feature flag is enabled
 * @param name - Feature flag name
 * @returns Promise<boolean> - True if feature is enabled
 */
export async function isFeatureEnabled(name: string): Promise<boolean> {
  const featureFlag = await FeatureFlag.findOne({ name: name.toLowerCase() });

  if (!featureFlag) {
    return false; // Feature flag doesn't exist, disabled by default
  }

  // Simple check: if enabled is true, feature is enabled
  return featureFlag.enabled;
}

/**
 * Get all enabled feature flags
 * @returns Promise<string[]> - Array of enabled feature flag names
 */
export async function getEnabledFeatures(): Promise<string[]> {
  const featureFlags = await FeatureFlag.find({ enabled: true }).lean();
  return featureFlags.map(flag => flag.name);
}

