import { type Role } from '@/lib/roles';
interface RoleUsersModalProps {
    role: Role;
    onClose: () => void;
}
export declare function RoleUsersModal({ role, onClose }: RoleUsersModalProps): import("react/jsx-runtime").JSX.Element;
export {};
