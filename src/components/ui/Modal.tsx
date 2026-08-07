import type {
    MouseEvent,
    ReactNode,
} from "react";

type ModalProps = {
    open: boolean;
    title: string;
    children: ReactNode;

    onClose: () => void;

    footer?: ReactNode;
};

export default function Modal({
    open,
    title,
    children,
    onClose,
    footer,
}: ModalProps) {
    if (!open) {
        return null;
    }

    function handleOverlayMouseDown(
        event: MouseEvent<HTMLDivElement>,
    ) {
        if (
            event.target ===
            event.currentTarget
        ) {
            onClose();
        }
    }

    return (
        <div
            className="modal-overlay"
            onMouseDown={
                handleOverlayMouseDown
            }
        >
            <section
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <header className="modal-header">
                    <h2 id="modal-title">
                        {title}
                    </h2>

                    <button
                        type="button"
                        className="modal-close-button"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </header>

                <div className="modal-content">
                    {children}
                </div>

                {footer && (
                    <footer className="modal-footer">
                        {footer}
                    </footer>
                )}
            </section>
        </div>
    );
}