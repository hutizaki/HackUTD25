import type { Permission, CreatePermissionRequest, UpdatePermissionRequest } from '@/lib/admin';
interface CreatePermissionModalProps {
    permission?: Permission;
    onSave: (data: CreatePermissionRequest | UpdatePermissionRequest) => Promise<void>;
    onCancel: () => void;
}
export declare function CreatePermissionModal({ permission, onSave, onCancel }: CreatePermissionModalProps): import("react/jsx-runtime").JSX.Element;
export {};
