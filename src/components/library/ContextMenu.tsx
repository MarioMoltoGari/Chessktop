import {
    useEffect,
    useRef,
} from "react";

export type ContextMenuItem = {
    id: string;
    label: string;

    danger?: boolean;
    disabled?: boolean;

    separatorBefore?: boolean;

    onClick: () => void;
};

type ContextMenuProps = {
    x: number;
    y: number;

    items: ContextMenuItem[];

    onClose: () => void;
};

export default function ContextMenu({
    x,
    y,
    items,
    onClose,
}: ContextMenuProps) {
    const menuRef =
        useRef<HTMLDivElement>(null);

    /*
     * Cerramos el menú al hacer clic fuera,
     * pulsar Escape o mover el scroll.
     */
    useEffect(() => {
        function handlePointerDown(
            event: PointerEvent,
        ) {
            const menu = menuRef.current;

            if (
                menu &&
                !menu.contains(
                    event.target as Node,
                )
            ) {
                onClose();
            }
        }

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        function handleScroll() {
            onClose();
        }

        document.addEventListener(
            "pointerdown",
            handlePointerDown,
        );

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        window.addEventListener(
            "scroll",
            handleScroll,
            true,
        );

        return () => {
            document.removeEventListener(
                "pointerdown",
                handlePointerDown,
            );

            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );

            window.removeEventListener(
                "scroll",
                handleScroll,
                true,
            );
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{
                left: x,
                top: y,
            }}
            role="menu"
            onContextMenu={(event) =>
                event.preventDefault()
            }
        >
            {items.map((item) => (
                <div
                    key={item.id}
                    className={
                        item.separatorBefore
                            ? "context-menu-separator"
                            : undefined
                    }
                >
                    <button
                        type="button"
                        role="menuitem"
                        className={`context-menu-item ${item.danger
                                ? "danger"
                                : ""
                            }`}
                        disabled={item.disabled}
                        onClick={() => {
                            if (item.disabled) {
                                return;
                            }

                            item.onClick();
                            onClose();
                        }}
                    >
                        {item.label}
                    </button>
                </div>
            ))}
        </div>
    );
}