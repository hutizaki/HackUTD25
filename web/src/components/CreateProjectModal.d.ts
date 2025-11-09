import type { Project } from '@/types/api';
interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (project: Project) => void;
}
export declare function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps): import("react/jsx-runtime").JSX.Element;
export {};
