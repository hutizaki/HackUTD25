import type { FeatureFlag } from '@/lib/admin';
interface DeleteFeatureFlagConfirmProps {
    featureFlag: FeatureFlag;
    onConfirm: () => void;
    onCancel: () => void;
}
export declare function DeleteFeatureFlagConfirm({ featureFlag, onConfirm, onCancel }: DeleteFeatureFlagConfirmProps): import("react/jsx-runtime").JSX.Element;
export {};
