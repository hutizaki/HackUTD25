import { type Permission } from '@/lib/admin';
interface PermissionFormModalProps {
    permission?: Permission | null;
    onClose: () => void;
    onSave: (data: {
        name: string;
        description: string;
        resources: string[];
        actions: string[];
    }) => Promise<void>;
    saving?: boolean;
}
export declare function PermissionFormModal({ permission, onClose, onSave, saving }: PermissionFormModalProps): import("react/jsx-runtime").JSX.Element;
export {};
