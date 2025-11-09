interface DocumentModalProps {
    collectionName: string;
    document: Record<string, unknown>;
    onClose: () => void;
    onUpdate: () => void;
}
export declare function DocumentModal({ collectionName, document, onClose, onUpdate }: DocumentModalProps): import("react/jsx-runtime").JSX.Element;
export {};
