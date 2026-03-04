type ToasterToast = {
    id: string;
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
};
type Toast = Omit<ToasterToast, "id">;
declare function toast(props: Toast): {
    id: string;
    dismiss: () => void;
    update: (p: Partial<ToasterToast>) => void;
};
declare function useToast(): {
    toast: typeof toast;
    dismiss: (toastId?: string) => void;
    toasts: ToasterToast[];
};
export { useToast, toast, type ToasterToast };
//# sourceMappingURL=use-toast.d.ts.map