import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport, } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
export function Toaster() {
    const { toasts } = useToast();
    return (_jsxs(ToastProvider, { children: [toasts.map(({ id, title, description, variant }) => (_jsxs(Toast, { variant: variant, children: [_jsxs("div", { className: "grid gap-1", children: [title && _jsx(ToastTitle, { children: title }), description && _jsx(ToastDescription, { children: description })] }), _jsx(ToastClose, {})] }, id))), _jsx(ToastViewport, {})] }));
}
