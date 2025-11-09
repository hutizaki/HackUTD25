import type { Role } from '@/lib/roles';
interface DeleteRoleConfirmProps {
    role: Role;
    onConfirm: () => void;
    onCancel: () => void;
}
export declare function DeleteRoleConfirm({ role, onConfirm, onCancel }: DeleteRoleConfirmProps): import("react/jsx-runtime").JSX.Element;
export {};
