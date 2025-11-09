import { type AdminUser } from '@/lib/admin';
interface EditUserModalProps {
    user: AdminUser | null;
    onClose: () => void;
    onSuccess: () => void;
}
export declare function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
