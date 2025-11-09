import { type AdminUser } from '@/lib/admin';
interface DeleteUserConfirmProps {
    user: AdminUser | null;
    onClose: () => void;
    onSuccess: () => void;
}
export declare function DeleteUserConfirm({ user, onClose, onSuccess }: DeleteUserConfirmProps): import("react/jsx-runtime").JSX.Element | null;
export {};
