import React from 'react';
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}
export declare function FormTextarea({ label, error, className, ...props }: FormTextareaProps): import("react/jsx-runtime").JSX.Element;
export {};
