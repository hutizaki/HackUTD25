import { type AdminUser } from '@/lib/admin';
interface UserListProps {
    onUserClick: (user: AdminUser) => void;
    currentUserId?: string | null;
}
export declare function UserList({ onUserClick }: UserListProps): import("react/jsx-runtime").JSX.Element;
export {};
