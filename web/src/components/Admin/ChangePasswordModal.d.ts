import { type AdminUser } from '@/lib/admin';
interface ChangePasswordModalProps {
    user: AdminUser | null;
    onClose: () => void;
    onSuccess: () => void;
}
export declare function ChangePasswordModal({ user, onClose, onSuccess }: ChangePasswordModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
