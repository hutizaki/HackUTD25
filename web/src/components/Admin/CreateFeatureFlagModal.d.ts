import { type FeatureFlag, type CreateFeatureFlagRequest, type UpdateFeatureFlagRequest } from '@/lib/admin';
interface CreateFeatureFlagModalProps {
    featureFlag?: FeatureFlag;
    onSave: (data: CreateFeatureFlagRequest | UpdateFeatureFlagRequest) => Promise<void>;
    onCancel: () => void;
}
export declare function CreateFeatureFlagModal({ featureFlag, onSave, onCancel }: CreateFeatureFlagModalProps): import("react/jsx-runtime").JSX.Element;
export {};
