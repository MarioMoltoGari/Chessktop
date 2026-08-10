import Modal from "./Modal";

type ConfirmModalProps = {
    open: boolean;
    title: string;
    message: string;

    confirmLabel?: string;
    cancelLabel?: string;

    destructive?: boolean;

    onConfirm: () => void;
    onClose: () => void;
};

export default function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    destructive = false,
    onConfirm,
    onClose,
}: ConfirmModalProps) {
    return (
        <Modal
            open={open}
            title={title}
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        className="modal-secondary-button"
                        onClick={onClose}
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        className={
                            destructive
                                ? "modal-danger-button"
                                : "modal-primary-button"
                        }
                        onClick={
                            onConfirm
                        }
                    >
                        {confirmLabel}
                    </button>
                </>
            }
        >
            <p className="modal-message">
                {message}
            </p>
        </Modal>
    );
}