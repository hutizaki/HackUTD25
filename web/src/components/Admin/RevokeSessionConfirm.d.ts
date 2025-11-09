import type { Session } from '@/lib/admin';
interface RevokeSessionConfirmProps {
    session: Session;
    onConfirm: () => void;
    onCancel: () => void;
}
export declare function RevokeSessionConfirm({ session, onConfirm, onCancel }: RevokeSessionConfirmProps): import("react/jsx-runtime").JSX.Element;
export {};
