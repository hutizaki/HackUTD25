import React from 'react';
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: Array<{
        value: string;
        label: string;
    }>;
}
export declare function FormSelect({ label, error, options, className, ...props }: FormSelectProps): import("react/jsx-runtime").JSX.Element;
export {};
