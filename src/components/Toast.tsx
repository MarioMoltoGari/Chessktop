type ToastProps = {
    message: string;
    visible: boolean;
};

export default function Toast({
    message,
    visible,
}: ToastProps) {
    return (
        <div
            className={`toast ${visible ? "toast-visible" : ""
                }`}
            role="status"
            aria-live="polite"
        >
            <span className="toast-icon">
                📚
            </span>

            <span>{message}</span>
        </div>
    );
}