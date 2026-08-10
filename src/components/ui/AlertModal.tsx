import Modal from "./Modal";

type AlertModalProps = {
    open: boolean;
    title: string;
    message: string;

    buttonLabel?: string;

    onClose: () => void;
};

export default function AlertModal({
    open,
    title,
    message,
    buttonLabel = "Entendido",
    onClose,
}: AlertModalProps) {
    return (
        <Modal
            open={open}
            title={title}
            onClose={onClose}
            footer={
                <button
                    type="button"
                    className="modal-primary-button"
                    onClick={onClose}
                >
                    {buttonLabel}
                </button>
            }
        >
            <p className="modal-message">
                {message}
            </p>
        </Modal>
    );
}