import { type AdminUser } from '@/lib/admin';
interface UserDetailsModalProps {
    user: AdminUser | null;
    currentUserId?: string | null;
    onClose: () => void;
    onUserUpdated: () => void;
}
export declare function UserDetailsModal({ user, currentUserId, onClose, onUserUpdated }: UserDetailsModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
