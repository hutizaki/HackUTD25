import type { Permission } from '@/lib/admin';
interface DeletePermissionConfirmProps {
    permission: Permission;
    onConfirm: () => void;
    onCancel: () => void;
}
export declare function DeletePermissionConfirm({ permission, onConfirm, onCancel }: DeletePermissionConfirmProps): import("react/jsx-runtime").JSX.Element;
export {};
