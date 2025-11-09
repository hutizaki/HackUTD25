import { type Role } from '@/lib/roles';
interface RoleFormModalProps {
    role?: Role | null;
    defaultGroupId?: string;
    onClose: () => void;
}
export declare function RoleFormModal({ role, defaultGroupId, onClose }: RoleFormModalProps): import("react/jsx-runtime").JSX.Element;
export {};
